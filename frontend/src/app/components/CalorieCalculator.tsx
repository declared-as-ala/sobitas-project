'use client';

import { useState } from 'react';
import { Sparkles, Flame } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Label } from '@/app/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import Link from 'next/link';

export function CalorieCalculator() {
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [activity, setActivity] = useState<'sedentary' | 'light' | 'moderate' | 'active' | 'very-active'>('moderate');
  const [goal, setGoal] = useState<'lose' | 'maintain' | 'gain'>('maintain');
  const [result, setResult] = useState<{
    bmr: number;
    tdee: number;
    target: number;
  } | null>(null);

  const calculateCalories = () => {
    const ageNum = parseFloat(age);
    const weightNum = parseFloat(weight);
    const heightNum = parseFloat(height);

    if (!ageNum || !weightNum || !heightNum || ageNum <= 0 || weightNum <= 0 || heightNum <= 0) return;

    // BMR calculation using Mifflin-St Jeor Equation
    let bmr: number;
    if (gender === 'male') {
      bmr = 10 * weightNum + 6.25 * heightNum - 5 * ageNum + 5;
    } else {
      bmr = 10 * weightNum + 6.25 * heightNum - 5 * ageNum - 161;
    }

    // Activity multipliers
    const activityMultipliers = {
      sedentary: 1.2,      // Little to no exercise
      light: 1.375,         // Light exercise 1-3 days/week
      moderate: 1.55,       // Moderate exercise 3-5 days/week
      active: 1.725,        // Heavy exercise 6-7 days/week
      'very-active': 1.9,   // Very heavy exercise, physical job
    };

    const tdee = Math.round(bmr * activityMultipliers[activity]);

    // Goal adjustments
    const goalAdjustments = {
      lose: -500,      // Deficit for weight loss
      maintain: 0,     // Maintain weight
      gain: 500,       // Surplus for weight gain
    };

    const target = tdee + goalAdjustments[goal];

    setResult({
      bmr: Math.round(bmr),
      tdee,
      target,
    });
  };

  const activityLabels = {
    sedentary: 'Sédentaire (peu ou pas d\'exercice)',
    light: 'Légère (1-3 jours/semaine)',
    moderate: 'Modérée (3-5 jours/semaine)',
    active: 'Active (6-7 jours/semaine)',
    'very-active': 'Très active (exercice intense quotidien)',
  };

  const goalLabels = {
    lose: 'Perte de poids',
    maintain: 'Maintien',
    gain: 'Prise de poids',
  };

  return (
    <Card className="bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 rounded-xl shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center">
            <Flame className="h-6 w-6" strokeWidth={1.75} />
          </div>
          <div>
            <CardTitle className="text-2xl font-display uppercase tracking-tight">Calculateur de Calories</CardTitle>
            <CardDescription>
              Calculez vos besoins caloriques quotidiens
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="age">Âge</Label>
            <Input
              id="age"
              type="number"
              placeholder="Ex: 25"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="h-12 text-lg rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gender">Genre</Label>
            <Select value={gender} onValueChange={(value: 'male' | 'female') => setGender(value)}>
              <SelectTrigger id="gender" className="h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Homme</SelectItem>
                <SelectItem value="female">Femme</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="weight">Poids (kg)</Label>
            <Input
              id="weight"
              type="number"
              placeholder="Ex: 75"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="h-12 text-lg rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="height">Taille (cm)</Label>
            <Input
              id="height"
              type="number"
              placeholder="Ex: 175"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              className="h-12 text-lg rounded-xl"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="activity">Niveau d'activité</Label>
          <Select value={activity} onValueChange={(value: 'sedentary' | 'light' | 'moderate' | 'active' | 'very-active') => setActivity(value)}>
            <SelectTrigger id="activity" className="h-12">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sedentary">{activityLabels.sedentary}</SelectItem>
              <SelectItem value="light">{activityLabels.light}</SelectItem>
              <SelectItem value="moderate">{activityLabels.moderate}</SelectItem>
              <SelectItem value="active">{activityLabels.active}</SelectItem>
              <SelectItem value="very-active">{activityLabels['very-active']}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="goal">Votre objectif</Label>
          <Select value={goal} onValueChange={(value: 'lose' | 'maintain' | 'gain') => setGoal(value)}>
            <SelectTrigger id="goal" className="h-12">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="lose">{goalLabels.lose}</SelectItem>
              <SelectItem value="maintain">{goalLabels.maintain}</SelectItem>
              <SelectItem value="gain">{goalLabels.gain}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={calculateCalories}
          className="w-full bg-red-600 hover:bg-red-700 text-white h-12 text-lg font-display uppercase tracking-wide"
        >
          Calculer
        </Button>

        {result !== null && (
          <div className="bg-white dark:bg-gray-950 rounded-xl p-6 border border-red-200 dark:border-red-900/60 shadow-sm space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <Sparkles className="h-6 w-6 text-red-600 dark:text-red-400" strokeWidth={1.75} />
              <h3 className="font-display uppercase tracking-tight text-xl font-bold text-gray-900 dark:text-white">
                Vos besoins caloriques
              </h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <span className="text-gray-600 dark:text-gray-400">Métabolisme de base (BMR)</span>
                <span className="font-display font-bold tracking-tight tabular-nums text-2xl text-gray-900 dark:text-white">{result.bmr} kcal</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <span className="text-gray-600 dark:text-gray-400">Dépense totale (TDEE)</span>
                <span className="font-display font-bold tracking-tight tabular-nums text-2xl text-gray-900 dark:text-white">{result.tdee} kcal</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-900/60">
                <span className="font-semibold text-gray-900 dark:text-white">Calories cibles</span>
                <span className="font-display font-bold tracking-tight tabular-nums text-3xl text-red-600 dark:text-red-400">{result.target} kcal</span>
              </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
              {goal === 'lose' && 'Pour perdre du poids, consommez environ 500 kcal de moins que votre TDEE.'}
              {goal === 'maintain' && 'Pour maintenir votre poids, consommez environ votre TDEE.'}
              {goal === 'gain' && 'Pour prendre du poids, consommez environ 500 kcal de plus que votre TDEE.'}
            </p>
            <Button
              asChild
              className="w-full bg-red-600 hover:bg-red-700 text-white font-display uppercase tracking-wide mt-4"
            >
              <Link href="/shop">
                Trouver mes produits
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
