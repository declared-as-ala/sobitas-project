# Mobile API Mapping - Protein.tn Mobile App

This document details how each screen in the Expo mobile app maps to the existing Laravel APIs and the new NestJS Fitness APIs.

## E-Commerce & Shop Features (Reused Laravel APIs)

Existing Laravel API base URL: `https://admin.protein.tn/api` (represented as `LARAVEL_API`)

| Mobile Screen | API Endpoint | Method | Payload / Query Params | Purpose |
|---|---|---|---|---|
| **Login** | `LARAVEL_API/login` | POST | `{ email, password }` | Authenticate user, return Sanctum token and user metadata. |
| **Register** | `LARAVEL_API/register` | POST | `{ name, email, phone, password }` | Register customer, return auth token. |
| **Home (Shop Hub)** | `LARAVEL_API/accueil` | GET | None | Load banners, new products, flash sales, best sellers, and categories. |
| **Home (Loyalty)** | `LARAVEL_API/profil` | GET | Auth Header | Fetch current client's loyalty points balance (`loyalty_points_balance`). |
| **Shop (Listing)** | `LARAVEL_API/all_products` | GET | `?page, per_page, search, brand_id, min_price, max_price, sort` | List products with pagination, search, sorting, and brand filtering. |
| **Shop (Categories)** | `LARAVEL_API/categories` | GET | None | Fetch all product categories. |
| **Shop (Brands)** | `LARAVEL_API/all_brands` | GET | None | Fetch all brands. |
| **Category Products** | `LARAVEL_API/productsByCategoryId/{slug}` | GET | None | Fetch products under a specific category. |
| **Subcategory Products** | `LARAVEL_API/productsBySubCategoryId/{slug}` | GET | `?page, per_page` | Fetch products under a specific subcategory. |
| **Product Search** | `LARAVEL_API/all_products?search={text}` | GET | None | Real-time product search. |
| **Product Details** | `LARAVEL_API/product_details/{slug}` | GET | None | Product metadata, details, ingredients, reviews, and related products. |
| **Cart** | *Local Storage* | - | - | Offline-first cart storage using Zustand and AsyncStorage. |
| **Apply Coupon** | `LARAVEL_API/coupons/apply` | POST | `{ coupon_code, total }` | Apply discount coupon to order. |
| **Checkout (Submit)** | `LARAVEL_API/add_commande` | POST | `{ commande: {...}, panier: [...] }` | Create a new order (stock is verified and decremented atomically). |
| **Order History** | `LARAVEL_API/client_commandes` | GET | Auth Header | List authenticated user's past orders. |
| **Order Details** | `LARAVEL_API/commande/{id}` | GET | Auth Header / Query token | Fetch full order details & status history. |
| **Profile** | `LARAVEL_API/profil` | GET | Auth Header | Fetch user account information. |
| **Update Profile** | `LARAVEL_API/update_profile` | POST | Auth Header, `{ name, email, phone, password }` | Update user details. |

---

## Fitness & Ecosystem Features (New NestJS APIs)

New NestJS API base URL: `http://localhost:4000/api/v1` (represented as `NEST_API`)

| Mobile Screen | API Endpoint | Method | Payload / Query Params | Purpose |
|---|---|---|---|---|
| **Onboarding** | `NEST_API/fitness-profile` | POST | `{ gender, age, height, weight, activityLevel, goal, etc. }` | Save onboarding answers, return generated TDEE and targets. |
| **Fitness Dashboard** | `NEST_API/fitness-profile` | GET | Auth Header | Fetch fitness profile and macro goals. |
| **Macro Tracker** | `NEST_API/protein-tracker` | GET | Auth Header | Fetch logged meals and total protein target progress. |
| **Log Protein** | `NEST_API/protein-tracker` | POST | `{ mealType, proteinAmount, description, date }` | Log protein/meal consumption. |
| **Water Tracker** | `NEST_API/water-tracker` | GET | Auth Header | Fetch daily water consumption. |
| **Log Water** | `NEST_API/water-tracker` | POST | `{ amount, date }` | Log water intake. |
| **Body Progress** | `NEST_API/body-progress` | GET | Auth Header | Fetch weight history and measurements over time. |
| **Log Weight/Size** | `NEST_API/body-progress` | POST | `{ weight, chest, waist, arms, legs, date }` | Log body measurements. |
| **Workouts Hub** | `NEST_API/workouts` | GET | `?category` | List workout programs for user goal/difficulty. |
| **Workout Logs** | `NEST_API/workout-logs` | POST | `{ exerciseId, weightUsed, repsCompleted, setsCompleted, notes, date }` | Log execution metrics for a specific exercise set. |
| **Supplement Advisor** | `NEST_API/supplement-advisor` | GET | `?goal` | Get product recommendations matching user fitness goals. |
| **Supplement Stack** | `NEST_API/supplement-stacks` | GET | Auth Header | Retrieve stack plan (dosages, timings, and reminders). |
| **Add to Stack** | `NEST_API/supplement-stacks` | POST | `{ productName, timing, dosage, dailyServing, totalServings }` | Add custom supplement with dosage & reminder schedule. |
| **Refill Reminders** | `NEST_API/refill-reminders` | GET | Auth Header | Fetch auto-calculated days remaining for each stack item. |
| **Loyalty Status** | `NEST_API/loyalty` | GET | Auth Header | Get points history, current level, and next target rewards. |
| **Referrals Hub** | `NEST_API/referrals` | GET | Auth Header | Fetch user referral code, invite counts, and pending rewards. |
| **AI Coach Chat** | `NEST_API/ai-coach` | POST | `{ message }` | Chat with AI Fitness Coach (supporting French, Arabic, English). |
| **Chat History** | `NEST_API/ai-coach/history` | GET | Auth Header | Load chat thread logs for context continuity. |
