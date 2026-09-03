'use client';

import { useState, useEffect, useMemo, memo, useCallback, useId } from 'react';
import { CircleAlert, RotateCcw } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Label } from '@/app/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Skeleton } from '@/app/components/ui/skeleton';
import type { AddressData } from '@/types';

interface AddressSelectorProps {
  gouvernorat: string;
  delegation: string;
  localite: string;
  codePostal: string;
  onGouvernoratChange: (value: string) => void;
  onDelegationChange: (value: string) => void;
  onLocaliteChange: (value: string, postalCode: string) => void;
  label?: string;
  required?: boolean;
  /** Native controls reduce effort on phones; opt-in keeps other address forms unchanged. */
  checkout?: boolean;
  errors?: Partial<Record<'gouvernorat' | 'delegation' | 'localite', string>>;
  onReadyChange?: (ready: boolean) => void;
}

function AddressSelectorComponent({
  gouvernorat,
  delegation,
  localite,
  codePostal,
  onGouvernoratChange,
  onDelegationChange,
  onLocaliteChange,
  label = 'Adresse',
  required = false,
  checkout = false,
  errors = {},
  onReadyChange,
}: AddressSelectorProps) {
  const [addressData, setAddressData] = useState<AddressData[]>([]);
  const [loading, setLoading] = useState(true);
  // Generate a unique ID for this component instance to ensure globally unique keys
  const instanceId = useId();
  const [loadFailed, setLoadFailed] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let timedOut = false;
    const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, 15000);
    setLoading(true);
    setLoadFailed(false);
    onReadyChange?.(false);
    // Load address data from JSON file
    const loadAddressData = async () => {
      try {
        const response = await fetch('/data.json', { signal: controller.signal, cache: retry ? 'reload' : 'default' });
        if (!response.ok) throw new Error('Failed to load address data');
        const data = await response.json();
        if (!Array.isArray(data) || !data.length) throw new Error('Empty address data');
        setAddressData(data);
        onReadyChange?.(true);
      } catch (error) {
        if (!controller.signal.aborted || timedOut) setLoadFailed(true);
      } finally {
        clearTimeout(timeout);
        if (!controller.signal.aborted || timedOut) setLoading(false);
      }
    };

    loadAddressData();
    return () => { clearTimeout(timeout); controller.abort(); };
  }, [retry, onReadyChange]);

  // Get unique gouvernorats - memoized with stable reference
  const gouvernorats = useMemo(() => {
    if (!addressData.length) return [];
    return addressData.map((gov) => ({
      name: gov.Name,
      value: gov.Value || gov.Name,
    }));
  }, [addressData]);

  // Get delegations for selected gouvernorat
  // The JSON now has a proper hierarchical structure: Gouvernorat -> Delegations -> Localités
  const delegations = useMemo(() => {
    if (!gouvernorat) return [];
    const selectedGov = addressData.find(
      (gov) => {
        const govValue = (gov.Value || gov.Name || '').trim();
        const searchValue = gouvernorat.trim();
        return govValue === searchValue || govValue.toUpperCase() === searchValue.toUpperCase();
      }
    );
    if (!selectedGov?.Delegations || !Array.isArray(selectedGov.Delegations)) return [];
    
    // Each Delegation now has a proper structure with Name, Value, and Localités array
    // Filter out delegations without Localités or with empty Localités
    // Use a Map to ensure we only have unique delegations by value
    const uniqueDelegationsMap = new Map<string, { name: string; value: string; index: number }>();
    
    selectedGov.Delegations
      .filter(del => del.Localités && Array.isArray(del.Localités) && del.Localités.length > 0)
      .forEach((del, index) => {
        const delValue = (del.Value || del.Name || '').trim();
        const delName = (del.Name || del.Value || '').trim();
        
        // Only add if we haven't seen this delegation value before
        if (delValue && !uniqueDelegationsMap.has(delValue)) {
          uniqueDelegationsMap.set(delValue, { name: delName, value: delValue, index });
        }
      });
    
    // Convert map to array with unique keys and values that include component instance ID
    return Array.from(uniqueDelegationsMap.entries())
      .map(([value, data], arrayIndex) => {
        // Create a unique value that includes instance ID to prevent conflicts across multiple AddressSelector instances
        const uniqueValue = `${instanceId}-${value}`;
        return {
          name: data.name,
          value: value, // Keep original value for callbacks
          uniqueValue: uniqueValue, // Use this as the SelectItem value prop
          // Create a globally unique key that includes component instance identifier
          uniqueKey: `del-${instanceId}-${gouvernorat}-${value}-${arrayIndex}`.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '')
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [gouvernorat, addressData, instanceId]);

  // Get localités for selected delegation
  // The JSON now has Localités nested under each Delegation
  const localites = useMemo(() => {
    if (!gouvernorat || !delegation) return [];
    const selectedGov = addressData.find(
      (gov) => {
        const govValue = (gov.Value || gov.Name || '').trim();
        const searchValue = gouvernorat.trim();
        return govValue === searchValue || govValue.toUpperCase() === searchValue.toUpperCase();
      }
    );
    if (!selectedGov?.Delegations || !Array.isArray(selectedGov.Delegations)) return [];
    
    // Find the selected delegation (case-insensitive)
    const normalizedDelegation = delegation.trim();
    const selectedDelegation = selectedGov.Delegations.find((del) => {
      const delValue = (del.Value || del.Name || '').trim();
      return delValue === normalizedDelegation || 
             delValue.toUpperCase() === normalizedDelegation.toUpperCase();
    });
    
    if (!selectedDelegation?.Localités || !Array.isArray(selectedDelegation.Localités) || selectedDelegation.Localités.length === 0) {
      return [];
    }
    
    // Map the Localités array to our format with unique keys
    // Use a Set to track seen names to avoid duplicates
    const seenNames = new Set<string>();
    
    return selectedDelegation.Localités
      .filter(loc => {
        const locName = (loc.Name || '').trim();
        if (!locName || seenNames.has(locName)) return false;
        seenNames.add(locName);
        return true;
      })
      .map((loc, index) => {
        const locName = (loc.Name || '').trim();
        const postalCode = (loc.PostalCode || '').trim();
        // Create a globally unique key and value that includes component instance identifier
        const uniqueValue = `${instanceId}-${locName}`;
        const keyParts = [instanceId, gouvernorat, delegation, locName, postalCode, index.toString()];
        return {
          Name: locName,
          Value: locName, // Keep original value for callbacks
          UniqueValue: uniqueValue, // Use this as the SelectItem value prop
          PostalCode: postalCode,
          UniqueKey: `loc-${keyParts.join('-')}`.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, ''),
        };
      })
      .sort((a, b) => a.Name.localeCompare(b.Name));
  }, [gouvernorat, delegation, addressData, instanceId]);

  const handleLocaliteChange = useCallback((value: string) => {
    const selectedLocalite = localites.find(
      (loc) => loc.Value === value
    );
    const postalCode = selectedLocalite?.PostalCode || '';
    // Pass the Name as the value since we're using Name as the value
    onLocaliteChange(value, postalCode);
  }, [localites, onLocaliteChange]);
  
  // Memoize handlers to prevent unnecessary re-renders
  const handleDelegationChange = useCallback((uniqueValue: string) => {
    const originalValue = uniqueValue.replace(`${instanceId}-`, '');
    onDelegationChange(originalValue);
  }, [instanceId, onDelegationChange]);
  
  const handleLocaliteValueChange = useCallback((uniqueValue: string) => {
    const originalValue = uniqueValue.replace(`${instanceId}-`, '');
    handleLocaliteChange(originalValue);
  }, [instanceId, handleLocaliteChange]);

  if (loading) {
    // Skeleton mirrors the gouvernorat field (label + h-10 select) so the form
    // reserves height and doesn't jump when the data resolves.
    return (
      <div className="space-y-5">
        <span className="sr-only" role="status">Chargement des données…</span>
        <div className="space-y-2" aria-hidden="true">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (loadFailed) return (
    <div className="rounded-xl border border-destructive bg-elevated p-3 text-sm">
      <p role="alert" className="flex items-start gap-2 text-destructive"><CircleAlert className="h-5 w-5 shrink-0" aria-hidden="true" />Impossible de charger les adresses.</p>
      <Button id={checkout ? 'checkout-address-retry' : undefined} type="button" variant="outline" onClick={() => setRetry(value => value + 1)} className="mt-2 min-h-11 border-rule text-ink-1 hover:bg-sunken">
        <RotateCcw className="me-2 h-4 w-4" aria-hidden="true" />Réessayer
      </Button>
    </div>
  );

  if (checkout) {
    const nativeField = (id: 'gouvernorat' | 'delegation' | 'localite', title: string, value: string, options: { name: string; value: string }[], onChange: (value: string) => void) => (
      <div className="min-w-0 space-y-1.5" data-checkout-field={id}>
        <Label htmlFor={id} className="block text-sm font-semibold text-ink-1">{title} {required && <span className="text-ink-3" aria-hidden="true">*</span>}</Label>
        <select id={id} name={id} value={value} required={required} onChange={event => onChange(event.target.value)}
          aria-invalid={!!errors[id]} aria-describedby={errors[id] ? `${id}-error` : undefined}
          className={`h-12 w-full rounded-xl border bg-canvas px-3 text-base text-ink-1 outline-none focus:ring-2 ${errors[id] ? 'border-destructive focus:ring-destructive' : 'border-rule-strong focus:border-brand focus:ring-focus'}`}>
          <option value="">Choisir {title === 'Gouvernorat' ? 'le gouvernorat' : title === 'Délégation' ? 'la délégation' : 'la localité'}</option>
          {options.map(option => <option key={option.value} value={option.value}>{option.name}</option>)}
        </select>
        {errors[id] && <p id={`${id}-error`} className="flex items-start gap-1.5 text-sm leading-5 text-destructive"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{errors[id]}</p>}
        {!options.length && <p className="text-sm text-destructive">Aucun choix disponible. Sélectionnez une autre adresse ou réessayez.</p>}
      </div>
    );
    return <div className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">{nativeField('gouvernorat', 'Gouvernorat', gouvernorat, gouvernorats, onGouvernoratChange)}</div>
      {gouvernorat && nativeField('delegation', 'Délégation', delegation, delegations, onDelegationChange)}
      {delegation && nativeField('localite', 'Localité', localite, localites.map(loc => ({ name: loc.Name, value: loc.Value })), handleLocaliteChange)}
      {codePostal && <p className="text-xs text-ink-3 sm:col-span-2">Code postal : {codePostal}</p>}
    </div>;
  }

  return (
    <div className="space-y-5">
      {/* Gouvernorat */}
      <div className="space-y-2">
        <Label htmlFor="gouvernorat" className="text-sm font-medium block">
          Gouvernorat {required && <span className="text-red-500">*</span>}
        </Label>
        <Select value={gouvernorat} onValueChange={onGouvernoratChange}>
          <SelectTrigger id="gouvernorat" className="w-full rounded-xl focus:border-red-500 focus:ring-red-500/30">
            <SelectValue placeholder="Sélectionnez le gouvernorat" />
          </SelectTrigger>
          <SelectContent side="bottom" position="popper">
            {gouvernorats.map((gov) => (
              <SelectItem key={`gov-${gov.value}`} value={gov.value}>
                {gov.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Délégation */}
      {gouvernorat && (
        <div className="space-y-2">
          <Label htmlFor="delegation" className="text-sm font-medium block">
            Délégation {required && <span className="text-red-500">*</span>}
          </Label>
          <Select
            value={delegation ? `${instanceId}-${delegation}` : ''}
            onValueChange={handleDelegationChange}
            disabled={!gouvernorat}
          >
            <SelectTrigger id="delegation" className="w-full rounded-xl focus:border-red-500 focus:ring-red-500/30">
              <SelectValue placeholder="Sélectionnez la délégation" />
            </SelectTrigger>
            <SelectContent side="bottom" position="popper">
              {delegations.length > 0 ? (
                delegations.map((del) => (
                  <SelectItem 
                    key={del.uniqueKey} 
                    value={del.uniqueValue}
                  >
                    {del.name}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="unavailable" disabled>
                  Aucune délégation disponible
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Localité */}
      {delegation && (
        <div className="space-y-2">
          <Label htmlFor="localite" className="text-sm font-medium block">
            Localité {required && <span className="text-red-500">*</span>}
          </Label>
          <Select
            value={localite ? `${instanceId}-${localite}` : ''}
            onValueChange={handleLocaliteValueChange}
            disabled={!delegation}
          >
            <SelectTrigger id="localite" className="w-full rounded-xl focus:border-red-500 focus:ring-red-500/30">
              <SelectValue placeholder="Sélectionnez la localité" />
            </SelectTrigger>
            <SelectContent side="bottom" position="popper">
              {localites.length > 0 ? (
                localites.map((loc) => (
                  <SelectItem
                    key={loc.UniqueKey}
                    value={loc.UniqueValue}
                  >
                    {loc.Name}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="unavailable" disabled>
                  Aucune localité disponible
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Code Postal (auto-filled) */}
      {codePostal && (
        <div>
          <Label htmlFor="code_postal" className="text-sm font-medium">
            Code Postal {required && <span className="text-red-500">*</span>}
          </Label>
          <input
            type="text"
            id="code_postal"
            value={codePostal}
            readOnly
            className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </div>
      )}
    </div>
  );
}

// Memoize the component to prevent unnecessary re-renders
export const AddressSelector = memo(AddressSelectorComponent);
