import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fitnessApi } from '../services/api';

export interface QueuedLog {
  id: string;
  type: 'water' | 'protein' | 'progress';
  payload: any;
  createdAt: number;
}

interface FitnessState {
  syncQueue: QueuedLog[];
  isOnline: boolean;
  
  setOnlineStatus: (status: boolean) => void;
  queueLog: (type: 'water' | 'protein' | 'progress', payload: any) => void;
  syncQueueToServer: () => Promise<void>;
  
  // Local caching lists to show offline-first UI instantly
  localWaterLogs: Record<string, number>; // date -> total ml
  localProteinLogs: Record<string, number>; // date -> total g
  
  addLocalWater: (date: string, amount: number) => void;
  addLocalProtein: (date: string, amount: number) => void;
  setLocalWater: (date: string, total: number) => void;
  setLocalProtein: (date: string, total: number) => void;
}

export const useFitnessStore = create<FitnessState>()(
  persist(
    (set, get) => ({
      syncQueue: [],
      isOnline: true,
      localWaterLogs: {},
      localProteinLogs: {},

      setOnlineStatus: (isOnline) => {
        set({ isOnline });
        if (isOnline && get().syncQueue.length > 0) {
          get().syncQueueToServer();
        }
      },

      queueLog: (type, payload) => {
        const id = `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newItem: QueuedLog = {
          id,
          type,
          payload,
          createdAt: Date.now(),
        };

        set({ syncQueue: [...get().syncQueue, newItem] });

        // Update local caches immediately so UI looks responsive even when offline
        const date = payload.date;
        if (type === 'water') {
          get().addLocalWater(date, payload.amount);
        } else if (type === 'protein') {
          get().addLocalProtein(date, payload.proteinAmount);
        }

        // If online, trigger sync immediately
        if (get().isOnline) {
          get().syncQueueToServer();
        }
      },

      syncQueueToServer: async () => {
        if (!get().isOnline) return;
        const queue = [...get().syncQueue];
        if (queue.length === 0) return;

        set({ syncQueue: [] }); // Clear queue temporarily during attempts to avoid double submissions

        const failedItems: QueuedLog[] = [];

        for (const item of queue) {
          try {
            if (item.type === 'water') {
              await fitnessApi.post('/water-tracker', item.payload);
            } else if (item.type === 'protein') {
              await fitnessApi.post('/protein-tracker', item.payload);
            } else if (item.type === 'progress') {
              await fitnessApi.post('/body-progress', item.payload);
            }
          } catch (e) {
            console.warn(`Sync failed for item ${item.id}, re-queuing`, e);
            failedItems.push(item);
          }
        }

        if (failedItems.length > 0) {
          set({ syncQueue: [...get().syncQueue, ...failedItems] });
        }
      },

      addLocalWater: (date, amount) => {
        const localWaterLogs = { ...get().localWaterLogs };
        localWaterLogs[date] = (localWaterLogs[date] || 0) + amount;
        set({ localWaterLogs });
      },

      addLocalProtein: (date, proteinAmount) => {
        const localProteinLogs = { ...get().localProteinLogs };
        localProteinLogs[date] = (localProteinLogs[date] || 0) + proteinAmount;
        set({ localProteinLogs });
      },

      setLocalWater: (date, total) => {
        const localWaterLogs = { ...get().localWaterLogs };
        localWaterLogs[date] = total;
        set({ localWaterLogs });
      },

      setLocalProtein: (date, total) => {
        const localProteinLogs = { ...get().localProteinLogs };
        localProteinLogs[date] = total;
        set({ localProteinLogs });
      },
    }),
    {
      name: 'protein-fitness-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
