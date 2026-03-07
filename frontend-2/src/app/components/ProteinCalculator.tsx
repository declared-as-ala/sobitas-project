'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { Calculator, Sparkles } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Label } from '@/app/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import Link from 'next/link';

export function ProteinCalculator() {
  const [weight, setWeight] = useState('');
  const [goal, setGoal] = useState<'muscle' | 'maintain' | 'cut'>('muscle');
  const [activity, setActivity] = useState<'low' | 'moderate' | 'high'>('moderate');
  const [result, setResult] = useState<number | null>(null);

  const calculateProtein = () => {
    const weightNum = parseFloat(weight);
    if (!weightNum || weightNum <= 0) return;

    // Base protein needs (grams per kg of bodyweight)
    const baseMultipliers = {
      muscle: 2.2, // 2.2g per kg for muscle gain
      maintain: 1.6, // 1.6g per kg for maintenance
      cut: 2.0, // 2.0g per kg for cutting
    };

    // Activity multipliers
    const activityMultipliers = {
      low: 1.0,
      moderate: 1.1,
      high: 1.2,
    };

    const baseProtein = weightNum * baseMultipliers[goal];
    const totalProtein = Math.round(baseProtein * activityMultipliers[activity]);
    
    setResult(totalProtein);
  };

  const goalLabels = {
    muscle: 'Prise de Masse',
    maintain: 'Maintien',
    cut: 'Perte de Poids',
  };

  const activityLabels = {
    low: 'Faible (3-4x/semaine)',
    moderate: 'Modérée (5-6x/semaine)',
    high: 'Élevée (6-7x/semaine)',
  };

  return (
    <Card className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 border-red-200 dark:border-red-900 shadow-xl">
      <CardHeader>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
            <Calculator className="h-6 w-6 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl">Calculateur de Protéines</CardTitle>
            <CardDescription>
              Trouvez votre besoin quotidien en protéines
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="weight">Votre poids (kg)</Label>
          <Input
            id="weight"
            type="number"
            placeholder="Ex: 75"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="h-12 text-lg"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="goal">Votre objectif</Label>
          <Select value={goal} onValueChange={(value: 'muscle' | 'maintain' | 'cut') => setGoal(value)}>
            <SelectTrigger id="goal" className="h-12">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="muscle">{goalLabels.muscle}</SelectItem>
              <SelectItem value="maintain">{goalLabels.maintain}</SelectItem>
              <SelectItem value="cut">{goalLabels.cut}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="activity">Niveau d'activité</Label>
          <Select value={activity} onValueChange={(value: 'low' | 'moderate' | 'high') => setActivity(value)}>
            <SelectTrigger id="activity" className="h-12">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">{activityLabels.low}</SelectItem>
              <SelectItem value="moderate">{activityLabels.moderate}</SelectItem>
              <SelectItem value="high">{activityLabels.high}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={calculateProtein}
          className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white h-12 text-lg font-bold"
        >
          Calculer
        </Button>

        {result !== null && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-900 rounded-xl p-6 border-2 border-red-500 shadow-lg"
          >
            <div className="flex items-center gap-3 mb-4">
              <Sparkles className="h-6 w-6 text-yellow-500" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Vos besoins quotidiens
              </h3>
            </div>
            <div className="text-center">
              <p className="text-5xl font-bold text-red-600 dark:text-red-400 mb-2">
                {result}g
              </p>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                de protéines par jour
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Répartissez cette quantité sur 4-6 repas pour une absorption optimale
              </p>
              <Button
                asChild
                className="w-full bg-red-600 hover:bg-red-700 text-white"
              >
                <Link href="/shop">
                  Trouver mes produits
                </Link>
              </Button>
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
