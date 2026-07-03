import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Starting database seed ===');

  // 1. Seed Workout Programs & Exercises
  console.log('Seeding workout programs...');
  
  const prog1 = await prisma.workoutProgram.create({
    data: {
      name: 'Muscle Gain Hypertrophy',
      description: 'Focus on progressive overload to stimulate muscle growth. Standard upper/lower hypertrophy workout.',
      category: 'muscle_gain',
      difficulty: 'intermediate',
      imageUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=400',
      exercises: {
        create: [
          { name: 'Flat Bench Press', sets: 4, reps: '8-12', restTime: 90, orderIndex: 1, notes: 'Barbell touch chest lightly, squeeze pecs.' },
          { name: 'Barbell Back Squat', sets: 4, reps: '8-10', restTime: 120, orderIndex: 2, notes: 'Keep back straight, squat below parallel.' },
          { name: 'Overhead Barbell Press', sets: 3, reps: '10', restTime: 90, orderIndex: 3, notes: 'Brace core, push overhead locking elbows.' },
          { name: 'Dumbbell Bicep Curl', sets: 3, reps: '12', restTime: 60, orderIndex: 4, notes: 'Keep elbows tucked, squeeze biceps.' },
        ]
      }
    }
  });

  const prog2 = await prisma.workoutProgram.create({
    data: {
      name: 'Cardio Fat Burner HIIT',
      description: 'High-intensity interval training designed to maximize caloric burn and maintain cardiovascular health.',
      category: 'fat_loss',
      difficulty: 'beginner',
      imageUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?q=80&w=400',
      exercises: {
        create: [
          { name: 'Bodyweight Squats', sets: 3, reps: '20', restTime: 30, orderIndex: 1, notes: 'Fast pace, full range of motion.' },
          { name: 'Push-Ups', sets: 3, reps: '15', restTime: 30, orderIndex: 2, notes: 'Core tight, chest to floor.' },
          { name: 'Mountain Climbers', sets: 3, reps: '30s', restTime: 30, orderIndex: 3, notes: 'Run knees in and out as fast as possible.' },
          { name: 'Plank Hold', sets: 3, reps: '60s', restTime: 30, orderIndex: 4, notes: 'Flat back, squeeze glutes.' },
        ]
      }
    }
  });

  const prog3 = await prisma.workoutProgram.create({
    data: {
      name: 'Powerlifting 5x5 Strength',
      description: 'Classic strength builder using compound lifts. Focus on heavy weight and low repetitions.',
      category: 'strength',
      difficulty: 'advanced',
      imageUrl: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?q=80&w=400',
      exercises: {
        create: [
          { name: 'Barbell Squats', sets: 5, reps: '5', restTime: 180, orderIndex: 1, notes: 'Heavy squats. Focus on depth and power.' },
          { name: 'Barbell Bench Press', sets: 5, reps: '5', restTime: 180, orderIndex: 2, notes: 'Heavy push. Keep scapula retracted.' },
          { name: 'Barbell Deadlift', sets: 1, reps: '5', restTime: 180, orderIndex: 3, notes: 'One working set. Brace core, drive through legs.' },
        ]
      }
    }
  });

  // 2. Seed Supplement Recommendation Rules
  console.log('Seeding supplement recommendations...');
  
  await prisma.supplementRecommendationRule.createMany({
    data: [
      { goal: 'muscle_gain', recommendedCategories: 'Protéines,Créatines,Whey', recommendedTags: 'whey,creatine,gainer', priority: 10 },
      { goal: 'weight_loss', recommendedCategories: 'Brûleurs de graisse,L-Carnitine,Protéines', recommendedTags: 'isolate,carnitine,cla', priority: 10 },
      { goal: 'recovery', recommendedCategories: 'BCAA & Acides Aminés,Vitamines & Santé,Magnésium', recommendedTags: 'glutamine,omega,magnesium', priority: 8 },
      { goal: 'strength', recommendedCategories: 'Pré-Workouts,Créatines', recommendedTags: 'pre-workout,creatine', priority: 9 },
      { goal: 'beginner', recommendedCategories: 'Protéines,Créatines', recommendedTags: 'whey,creatine', priority: 5 },
      { goal: 'health', recommendedCategories: 'Vitamines & Santé,Oméga 3', recommendedTags: 'multivitamin,omega', priority: 6 }
    ]
  });

  // 3. Seed Notification Templates
  console.log('Seeding notification templates...');

  await prisma.notificationTemplate.createMany({
    data: [
      { type: 'refill', title: 'Refill your supplement stock! ⏳', body: 'Your supplement is running low. Reorder now from Protein.tn and keep crushing your goals!' },
      { type: 'workout', title: 'Time to hit the gym! 💪', body: 'Don\'t skip your workout today. Consistency is key to unlocking your targets.' },
      { type: 'water', title: 'Hydration check! 💧', body: 'Time to drink a glass of water and stay hydrated for better athletic performance.' },
      { type: 'protein', title: 'Daily protein check 🍗', body: 'Did you log your meals? Make sure to hit your daily protein targets.' },
      { type: 'loyalty', title: 'Points updated! 🏆', body: 'You earned loyalty points today! Check your rewards level in the tab.' }
    ]
  });

  console.log('=== Database seed completed successfully ===');
}

main()
  .catch((e) => {
    console.error('Error during database seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
