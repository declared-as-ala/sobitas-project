-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Hôte : 127.0.0.1
-- Généré le : jeu. 15 juin 2023 à 22:59
-- Version du serveur : 10.4.28-MariaDB
-- Version de PHP : 8.2.4

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de données : `sobitas`
--

-- --------------------------------------------------------

--
-- Structure de la table `categories`
--

CREATE TABLE `categories` (
  `id` int(10) UNSIGNED NOT NULL,
  `parent_id` int(10) UNSIGNED DEFAULT NULL,
  `order` int(11) NOT NULL DEFAULT 1,
  `name` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `designation_fr` varchar(255) DEFAULT NULL,
  `description_fr` text DEFAULT NULL,
  `created_by` varchar(255) DEFAULT NULL,
  `updated_by` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `categories`
--

INSERT INTO `categories` (`id`, `parent_id`, `order`, `name`, `slug`, `created_at`, `updated_at`, `designation_fr`, `description_fr`, `created_by`, `updated_by`) VALUES
(1, NULL, 1, 'Category 1', 'category-1', '2023-05-13 10:10:25', '2023-05-13 10:10:25', NULL, NULL, NULL, NULL),
(2, NULL, 1, 'Category 2', 'category-2', '2023-05-13 10:10:25', '2023-05-13 10:10:25', NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Structure de la table `categs`
--

CREATE TABLE `categs` (
  `id` int(10) UNSIGNED NOT NULL,
  `designation_fr` varchar(255) DEFAULT NULL,
  `description_fr` text DEFAULT NULL,
  `created_by` varchar(255) DEFAULT NULL,
  `updated_by` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structure de la table `clients`
--

CREATE TABLE `clients` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `adresse` varchar(255) DEFAULT NULL,
  `matricule` varchar(255) DEFAULT NULL,
  `phone_1` varchar(255) DEFAULT NULL,
  `phone_2` varchar(255) DEFAULT NULL,
  `created_by` varchar(255) DEFAULT NULL,
  `updated_by` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `clients`
--

INSERT INTO `clients` (`id`, `name`, `email`, `adresse`, `matricule`, `phone_1`, `phone_2`, `created_by`, `updated_by`, `created_at`, `updated_at`) VALUES
(11, 'Wissem Debech', 'wissemdebech@gmail.com', 'hamem sousse', '1234567Y', '21909597', NULL, NULL, NULL, '2023-05-24 13:57:57', '2023-05-24 13:57:57'),
(12, 'Mohamed', NULL, 'Ahmed', NULL, '23456789', NULL, NULL, NULL, '2023-05-24 14:38:53', '2023-05-24 14:38:53'),
(13, 'test', NULL, 'test', NULL, '21212122', NULL, NULL, NULL, '2023-05-29 17:11:04', '2023-05-29 17:11:04');

-- --------------------------------------------------------

--
-- Structure de la table `commandes`
--

CREATE TABLE `commandes` (
  `id` int(10) UNSIGNED NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `remise` double DEFAULT NULL,
  `prix_ht` double DEFAULT NULL,
  `prix_ttc` double DEFAULT NULL,
  `tva` double DEFAULT NULL,
  `timbre` double DEFAULT NULL,
  `etat` varchar(255) DEFAULT NULL,
  `created_by` varchar(255) DEFAULT NULL,
  `updated_by` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structure de la table `commande_details`
--

CREATE TABLE `commande_details` (
  `id` int(10) UNSIGNED NOT NULL,
  `commande_id` int(11) DEFAULT NULL,
  `produit_id` int(11) DEFAULT NULL,
  `qte` int(11) DEFAULT NULL,
  `created_by` varchar(255) DEFAULT NULL,
  `updated_by` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structure de la table `coordinates`
--

CREATE TABLE `coordinates` (
  `id` int(10) UNSIGNED NOT NULL,
  `designation_fr` varchar(255) DEFAULT NULL,
  `abbreviation` varchar(255) DEFAULT NULL,
  `matricule` varchar(255) DEFAULT NULL,
  `rib` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `adresse_fr` varchar(255) DEFAULT NULL,
  `phone_1` varchar(255) DEFAULT NULL,
  `phone_2` varchar(255) DEFAULT NULL,
  `cover` varchar(255) DEFAULT NULL,
  `site_web` varchar(255) DEFAULT NULL,
  `facebook_link` varchar(255) DEFAULT NULL,
  `youtube_link` varchar(255) DEFAULT NULL,
  `favicon` varchar(255) DEFAULT NULL,
  `logo` varchar(255) DEFAULT NULL,
  `logo_facture` varchar(255) DEFAULT NULL,
  `logo_footer` varchar(255) DEFAULT NULL,
  `short_description_fr` text DEFAULT NULL,
  `description_fr` text DEFAULT NULL,
  `created_by` varchar(255) DEFAULT NULL,
  `updated_by` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `timbre` double DEFAULT NULL,
  `tva` double DEFAULT NULL,
  `short_description_ticket` varchar(255) DEFAULT NULL,
  `footer_ticket` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `coordinates`
--

INSERT INTO `coordinates` (`id`, `designation_fr`, `abbreviation`, `matricule`, `rib`, `email`, `adresse_fr`, `phone_1`, `phone_2`, `cover`, `site_web`, `facebook_link`, `youtube_link`, `favicon`, `logo`, `logo_facture`, `logo_footer`, `short_description_fr`, `description_fr`, `created_by`, `updated_by`, `created_at`, `updated_at`, `timbre`, `tva`, `short_description_ticket`, `footer_ticket`) VALUES
(1, NULL, 'SOBITAS', '1411068/Q/A/M/000', '12503000003301717490', 'contact@sobitas.tn', 'Rue Ribat, 4000 Sousse Tunisie', '27 612 500', '73 200 169', NULL, 'https://sobitas.tn/', 'https://www.facebook.com/sobitass/', NULL, NULL, NULL, 'coordonnees\\June2023\\mZ6VWG8biAMklodyYzzE.png', NULL, NULL, NULL, NULL, NULL, '2023-05-20 11:23:37', '2023-06-03 23:34:42', 1, 19, 'Bienvenue chez SOBITAS', 'SOBITAS vous remercie de votre visite');

-- --------------------------------------------------------

--
-- Structure de la table `data_rows`
--

CREATE TABLE `data_rows` (
  `id` int(10) UNSIGNED NOT NULL,
  `data_type_id` int(10) UNSIGNED NOT NULL,
  `field` varchar(255) NOT NULL,
  `type` varchar(255) NOT NULL,
  `display_name` varchar(255) NOT NULL,
  `required` tinyint(1) NOT NULL DEFAULT 0,
  `browse` tinyint(1) NOT NULL DEFAULT 1,
  `read` tinyint(1) NOT NULL DEFAULT 1,
  `edit` tinyint(1) NOT NULL DEFAULT 1,
  `add` tinyint(1) NOT NULL DEFAULT 1,
  `delete` tinyint(1) NOT NULL DEFAULT 1,
  `details` text DEFAULT NULL,
  `order` int(11) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `data_rows`
--

INSERT INTO `data_rows` (`id`, `data_type_id`, `field`, `type`, `display_name`, `required`, `browse`, `read`, `edit`, `add`, `delete`, `details`, `order`) VALUES
(1, 1, 'id', 'number', 'ID', 1, 0, 0, 0, 0, 0, NULL, 1),
(2, 1, 'name', 'text', 'Name', 1, 1, 1, 1, 1, 1, NULL, 2),
(3, 1, 'email', 'text', 'Email', 1, 1, 1, 1, 1, 1, NULL, 3),
(4, 1, 'password', 'password', 'Password', 1, 0, 0, 1, 1, 0, NULL, 4),
(5, 1, 'remember_token', 'text', 'Remember Token', 0, 0, 0, 0, 0, 0, NULL, 5),
(6, 1, 'created_at', 'timestamp', 'Created At', 0, 1, 1, 0, 0, 0, NULL, 6),
(7, 1, 'updated_at', 'timestamp', 'Updated At', 0, 0, 0, 0, 0, 0, NULL, 7),
(8, 1, 'avatar', 'image', 'Avatar', 0, 1, 1, 1, 1, 1, NULL, 8),
(9, 1, 'user_belongsto_role_relationship', 'relationship', 'Role', 0, 1, 1, 1, 1, 0, '{\"model\":\"TCG\\\\Voyager\\\\Models\\\\Role\",\"table\":\"roles\",\"type\":\"belongsTo\",\"column\":\"role_id\",\"key\":\"id\",\"label\":\"display_name\",\"pivot_table\":\"roles\",\"pivot\":0}', 10),
(10, 1, 'user_belongstomany_role_relationship', 'relationship', 'Roles', 0, 1, 1, 1, 1, 0, '{\"model\":\"TCG\\\\Voyager\\\\Models\\\\Role\",\"table\":\"roles\",\"type\":\"belongsToMany\",\"column\":\"id\",\"key\":\"id\",\"label\":\"display_name\",\"pivot_table\":\"user_roles\",\"pivot\":\"1\",\"taggable\":\"0\"}', 11),
(11, 1, 'settings', 'hidden', 'Settings', 0, 0, 0, 0, 0, 0, NULL, 12),
(12, 2, 'id', 'number', 'ID', 1, 0, 0, 0, 0, 0, NULL, 1),
(13, 2, 'name', 'text', 'Name', 1, 1, 1, 1, 1, 1, NULL, 2),
(14, 2, 'created_at', 'timestamp', 'Created At', 0, 0, 0, 0, 0, 0, NULL, 3),
(15, 2, 'updated_at', 'timestamp', 'Updated At', 0, 0, 0, 0, 0, 0, NULL, 4),
(16, 3, 'id', 'number', 'ID', 1, 0, 0, 0, 0, 0, NULL, 1),
(17, 3, 'name', 'text', 'Name', 1, 1, 1, 1, 1, 1, NULL, 2),
(18, 3, 'created_at', 'timestamp', 'Created At', 0, 0, 0, 0, 0, 0, NULL, 3),
(19, 3, 'updated_at', 'timestamp', 'Updated At', 0, 0, 0, 0, 0, 0, NULL, 4),
(20, 3, 'display_name', 'text', 'Display Name', 1, 1, 1, 1, 1, 1, NULL, 5),
(21, 1, 'role_id', 'text', 'Role', 1, 1, 1, 1, 1, 1, NULL, 9),
(29, 5, 'id', 'number', 'ID', 1, 0, 0, 0, 0, 0, NULL, 1),
(30, 5, 'author_id', 'text', 'Author', 1, 0, 1, 1, 0, 1, NULL, 2),
(31, 5, 'category_id', 'text', 'Category', 1, 0, 1, 1, 1, 0, NULL, 3),
(32, 5, 'title', 'text', 'Title', 1, 1, 1, 1, 1, 1, NULL, 4),
(33, 5, 'excerpt', 'text_area', 'Excerpt', 1, 0, 1, 1, 1, 1, NULL, 5),
(34, 5, 'body', 'rich_text_box', 'Body', 1, 0, 1, 1, 1, 1, NULL, 6),
(35, 5, 'image', 'image', 'Post Image', 0, 1, 1, 1, 1, 1, '{\"resize\":{\"width\":\"1000\",\"height\":\"null\"},\"quality\":\"70%\",\"upsize\":true,\"thumbnails\":[{\"name\":\"medium\",\"scale\":\"50%\"},{\"name\":\"small\",\"scale\":\"25%\"},{\"name\":\"cropped\",\"crop\":{\"width\":\"300\",\"height\":\"250\"}}]}', 7),
(36, 5, 'slug', 'text', 'Slug', 1, 0, 1, 1, 1, 1, '{\"slugify\":{\"origin\":\"title\",\"forceUpdate\":true},\"validation\":{\"rule\":\"unique:posts,slug\"}}', 8),
(37, 5, 'meta_description', 'text_area', 'Meta Description', 1, 0, 1, 1, 1, 1, NULL, 9),
(38, 5, 'meta_keywords', 'text_area', 'Meta Keywords', 1, 0, 1, 1, 1, 1, NULL, 10),
(39, 5, 'status', 'select_dropdown', 'Status', 1, 1, 1, 1, 1, 1, '{\"default\":\"DRAFT\",\"options\":{\"PUBLISHED\":\"published\",\"DRAFT\":\"draft\",\"PENDING\":\"pending\"}}', 11),
(40, 5, 'created_at', 'timestamp', 'Created At', 0, 1, 1, 0, 0, 0, NULL, 12),
(41, 5, 'updated_at', 'timestamp', 'Updated At', 0, 0, 0, 0, 0, 0, NULL, 13),
(42, 5, 'seo_title', 'text', 'SEO Title', 0, 1, 1, 1, 1, 1, NULL, 14),
(43, 5, 'featured', 'checkbox', 'Featured', 1, 1, 1, 1, 1, 1, NULL, 15),
(44, 6, 'id', 'number', 'ID', 1, 0, 0, 0, 0, 0, NULL, 1),
(45, 6, 'author_id', 'text', 'Author', 1, 0, 0, 0, 0, 0, NULL, 2),
(46, 6, 'title', 'text', 'Title', 1, 1, 1, 1, 1, 1, NULL, 3),
(47, 6, 'excerpt', 'text_area', 'Excerpt', 1, 0, 1, 1, 1, 1, NULL, 4),
(48, 6, 'body', 'rich_text_box', 'Body', 1, 0, 1, 1, 1, 1, NULL, 5),
(49, 6, 'slug', 'text', 'Slug', 1, 0, 1, 1, 1, 1, '{\"slugify\":{\"origin\":\"title\"},\"validation\":{\"rule\":\"unique:pages,slug\"}}', 6),
(50, 6, 'meta_description', 'text', 'Meta Description', 1, 0, 1, 1, 1, 1, NULL, 7),
(51, 6, 'meta_keywords', 'text', 'Meta Keywords', 1, 0, 1, 1, 1, 1, NULL, 8),
(52, 6, 'status', 'select_dropdown', 'Status', 1, 1, 1, 1, 1, 1, '{\"default\":\"INACTIVE\",\"options\":{\"INACTIVE\":\"INACTIVE\",\"ACTIVE\":\"ACTIVE\"}}', 9),
(53, 6, 'created_at', 'timestamp', 'Created At', 1, 1, 1, 0, 0, 0, NULL, 10),
(54, 6, 'updated_at', 'timestamp', 'Updated At', 1, 0, 0, 0, 0, 0, NULL, 11),
(55, 6, 'image', 'image', 'Page Image', 0, 1, 1, 1, 1, 1, NULL, 12),
(56, 7, 'id', 'text', 'Id', 1, 0, 0, 0, 0, 0, '{}', 1),
(57, 7, 'user_id', 'text', 'User Id', 0, 0, 0, 0, 0, 0, '{}', 2),
(58, 7, 'remise', 'text', 'Remise', 0, 1, 1, 1, 1, 1, '{}', 7),
(59, 7, 'prix_ht', 'text', 'Prix HT', 0, 1, 1, 1, 1, 1, '{}', 6),
(60, 7, 'prix_ttc', 'text', 'Prix TTC', 0, 1, 1, 1, 1, 1, '{}', 11),
(61, 7, 'tva', 'text', 'TVA', 0, 1, 1, 1, 1, 1, '{}', 9),
(62, 7, 'timbre', 'text', 'Timbre', 0, 1, 1, 1, 1, 1, '{}', 10),
(63, 7, 'numero', 'text', 'Numéro de facture', 0, 1, 1, 1, 1, 1, '{}', 3),
(68, 7, 'created_by', 'text', 'Crée par', 0, 0, 0, 0, 0, 0, '{}', 12),
(69, 7, 'updated_by', 'text', 'Modifié par', 0, 0, 0, 0, 0, 0, '{}', 14),
(70, 7, 'created_at', 'timestamp', 'Date de Facture', 0, 1, 1, 1, 1, 1, '{}', 4),
(71, 7, 'updated_at', 'timestamp', 'Modifié le', 0, 0, 0, 0, 0, 0, '{}', 15),
(72, 8, 'id', 'text', 'Id', 1, 0, 0, 0, 0, 0, '{}', 1),
(73, 8, 'sous_categorie_id', 'text', 'Sous Categorie Id', 0, 1, 1, 1, 1, 1, '{}', 3),
(74, 8, 'designation_fr', 'text', 'Désignation', 0, 1, 1, 1, 1, 1, '{}', 5),
(75, 8, 'cover', 'image', 'Couverture', 0, 1, 1, 1, 1, 1, '{}', 6),
(76, 8, 'qte', 'text', 'Qte', 0, 1, 1, 1, 1, 1, '{}', 7),
(77, 8, 'prix_ht', 'text', 'Prix HT', 0, 0, 0, 0, 0, 0, '{}', 8),
(78, 8, 'prix', 'text', 'Prix', 0, 1, 1, 1, 1, 1, '{}', 9),
(79, 8, 'promo_ht', 'text', 'Promo HT', 0, 0, 0, 0, 0, 0, '{}', 10),
(80, 8, 'promo', 'text', 'Promo', 0, 0, 0, 0, 0, 0, '{}', 11),
(81, 8, 'description_fr', 'rich_text_box', 'Description', 0, 1, 1, 1, 1, 1, '{}', 12),
(82, 8, 'publier', 'checkbox', 'Publier', 0, 1, 1, 1, 1, 1, '{\"on\":\"Publier\",\"off\":\"Masquer\",\"checked\":true}', 13),
(83, 8, 'created_by', 'text', 'Crée par', 0, 0, 0, 0, 0, 0, '{}', 14),
(84, 8, 'updated_by', 'text', 'Modifié par', 0, 0, 0, 0, 0, 0, '{}', 15),
(85, 8, 'created_at', 'timestamp', 'Enregistrement', 0, 0, 1, 0, 0, 0, '{}', 16),
(86, 8, 'updated_at', 'timestamp', 'Updated At', 0, 0, 0, 0, 0, 0, '{}', 17),
(87, 9, 'id', 'text', 'Id', 1, 0, 0, 0, 0, 0, '{}', 1),
(88, 9, 'facture_id', 'text', 'Facture Id', 0, 1, 1, 1, 1, 1, '{}', 2),
(89, 9, 'produit_id', 'text', 'Produit Id', 0, 1, 1, 1, 1, 1, '{}', 3),
(90, 9, 'designation', 'text', 'Designation', 0, 1, 1, 1, 1, 1, '{}', 4),
(91, 9, 'qte', 'text', 'Qte', 0, 1, 1, 1, 1, 1, '{}', 5),
(92, 9, 'created_by', 'text', 'Created By', 0, 1, 1, 1, 1, 1, '{}', 6),
(93, 9, 'updated_by', 'text', 'Updated By', 0, 1, 1, 1, 1, 1, '{}', 7),
(94, 9, 'created_at', 'timestamp', 'Created At', 0, 1, 1, 1, 0, 1, '{}', 8),
(95, 9, 'updated_at', 'timestamp', 'Updated At', 0, 0, 0, 0, 0, 0, '{}', 9),
(96, 10, 'id', 'text', 'Id', 1, 0, 0, 0, 0, 0, '{}', 1),
(97, 10, 'categorie_id', 'text', 'Categorie Id', 0, 1, 1, 1, 1, 1, '{}', 3),
(98, 10, 'designation_fr', 'text', 'Désignation', 0, 1, 1, 1, 1, 1, '{}', 4),
(99, 10, 'description_fr', 'text', 'Description', 0, 1, 1, 1, 1, 1, '{}', 5),
(100, 10, 'created_by', 'text', 'Created By', 0, 0, 0, 0, 0, 0, '{}', 6),
(101, 10, 'updated_by', 'text', 'Updated By', 0, 0, 0, 0, 0, 0, '{}', 7),
(102, 10, 'created_at', 'timestamp', 'Created At', 0, 0, 1, 0, 0, 0, '{}', 8),
(103, 10, 'updated_at', 'timestamp', 'Updated At', 0, 0, 0, 0, 0, 0, '{}', 9),
(108, 11, 'id', 'text', 'Id', 1, 0, 0, 0, 0, 0, '{}', 1),
(109, 11, 'remise', 'text', 'Remise', 0, 1, 1, 1, 1, 1, '{}', 7),
(110, 11, 'prix_ht', 'text', 'Prix Ht', 0, 1, 1, 1, 1, 1, '{}', 6),
(111, 11, 'prix_ttc', 'text', 'Prix Ttc', 0, 1, 1, 1, 1, 1, '{}', 11),
(112, 11, 'tva', 'text', 'Tva', 0, 1, 1, 1, 1, 1, '{}', 9),
(113, 11, 'numero', 'text', 'Numero de ticket', 0, 1, 1, 1, 1, 1, '{}', 2),
(114, 11, 'created_by', 'text', 'Created By', 0, 0, 0, 0, 0, 0, '{}', 12),
(115, 11, 'updated_by', 'text', 'Updated By', 0, 0, 0, 0, 0, 0, '{}', 13),
(116, 11, 'created_at', 'timestamp', 'Date de Ticket', 0, 1, 1, 1, 0, 1, '{}', 5),
(117, 11, 'updated_at', 'timestamp', 'Updated At', 0, 0, 0, 0, 0, 0, '{}', 14),
(118, 12, 'id', 'text', 'Id', 1, 0, 0, 0, 0, 0, '{}', 1),
(119, 12, 'ticket_id', 'text', 'Ticket Id', 0, 1, 1, 1, 1, 1, '{}', 2),
(120, 12, 'produit_id', 'text', 'Produit Id', 0, 1, 1, 1, 1, 1, '{}', 3),
(121, 12, 'designation_fr', 'text', 'Designation Fr', 0, 1, 1, 1, 1, 1, '{}', 4),
(122, 12, 'qte', 'text', 'Qte', 0, 1, 1, 1, 1, 1, '{}', 5),
(123, 12, 'created_by', 'text', 'Created By', 0, 1, 1, 1, 1, 1, '{}', 6),
(124, 12, 'updated_by', 'text', 'Updated By', 0, 1, 1, 1, 1, 1, '{}', 7),
(125, 12, 'created_at', 'timestamp', 'Created At', 0, 1, 1, 1, 0, 1, '{}', 8),
(126, 12, 'updated_at', 'timestamp', 'Updated At', 0, 0, 0, 0, 0, 0, '{}', 9),
(127, 13, 'id', 'text', 'Id', 1, 0, 0, 0, 0, 0, '{}', 1),
(128, 13, 'user_id', 'text', 'User Id', 0, 1, 1, 1, 1, 1, '{}', 2),
(129, 13, 'remise', 'text', 'Remise', 0, 1, 1, 1, 1, 1, '{}', 3),
(130, 13, 'prix_ht', 'text', 'Prix Ht', 0, 1, 1, 1, 1, 1, '{}', 4),
(131, 13, 'prix_ttc', 'text', 'Prix Ttc', 0, 1, 1, 1, 1, 1, '{}', 5),
(132, 13, 'tva', 'text', 'Tva', 0, 1, 1, 1, 1, 1, '{}', 6),
(133, 13, 'timbre', 'text', 'Timbre', 0, 1, 1, 1, 1, 1, '{}', 7),
(134, 13, 'etat', 'text', 'Etat', 0, 1, 1, 1, 1, 1, '{}', 8),
(135, 13, 'created_by', 'text', 'Created By', 0, 1, 1, 1, 1, 1, '{}', 9),
(136, 13, 'updated_by', 'text', 'Updated By', 0, 1, 1, 1, 1, 1, '{}', 10),
(137, 13, 'created_at', 'timestamp', 'Created At', 0, 1, 1, 1, 0, 1, '{}', 11),
(138, 13, 'updated_at', 'timestamp', 'Updated At', 0, 0, 0, 0, 0, 0, '{}', 12),
(139, 14, 'id', 'text', 'Id', 1, 0, 0, 0, 0, 0, '{}', 1),
(140, 14, 'commande_id', 'text', 'Commande Id', 0, 1, 1, 1, 1, 1, '{}', 2),
(141, 14, 'produit_id', 'text', 'Produit Id', 0, 1, 1, 1, 1, 1, '{}', 3),
(142, 14, 'qte', 'text', 'Qte', 0, 1, 1, 1, 1, 1, '{}', 4),
(143, 14, 'created_by', 'text', 'Created By', 0, 1, 1, 1, 1, 1, '{}', 5),
(144, 14, 'updated_by', 'text', 'Updated By', 0, 1, 1, 1, 1, 1, '{}', 6),
(145, 14, 'created_at', 'timestamp', 'Created At', 0, 1, 1, 1, 0, 1, '{}', 7),
(146, 14, 'updated_at', 'timestamp', 'Updated At', 0, 0, 0, 0, 0, 0, '{}', 8),
(147, 15, 'id', 'text', 'Id', 1, 0, 0, 0, 0, 0, '{}', 1),
(148, 15, 'designation_fr', 'text', 'Designation Fr', 0, 1, 1, 1, 1, 1, '{}', 2),
(149, 15, 'abbreviation', 'text', 'Abréviation', 0, 1, 1, 1, 1, 1, '{}', 3),
(150, 15, 'matricule', 'text', 'Matricule', 0, 1, 1, 1, 1, 1, '{}', 4),
(151, 15, 'rib', 'text', 'RIB', 0, 1, 1, 1, 1, 1, '{}', 5),
(152, 15, 'email', 'text', 'Email', 0, 1, 1, 1, 1, 1, '{}', 6),
(153, 15, 'adresse_fr', 'text', 'Adresse', 0, 1, 1, 1, 1, 1, '{}', 7),
(154, 15, 'phone_1', 'text', 'Téléphone 1', 0, 1, 1, 1, 1, 1, '{}', 8),
(155, 15, 'phone_2', 'text', 'Téléphone  2', 0, 1, 1, 1, 1, 1, '{}', 9),
(156, 15, 'cover', 'image', 'Couverture', 0, 1, 1, 1, 1, 1, '{}', 10),
(157, 15, 'site_web', 'text', 'Site Web', 0, 1, 1, 1, 1, 1, '{}', 11),
(158, 15, 'facebook_link', 'text', 'Lien Facebook', 0, 1, 1, 1, 1, 1, '{}', 12),
(159, 15, 'youtube_link', 'text', 'Lien Youtube', 0, 1, 1, 1, 1, 1, '{}', 13),
(160, 15, 'favicon', 'image', 'Favicon', 0, 1, 1, 1, 1, 1, '{}', 14),
(161, 15, 'logo', 'image', 'Logo', 0, 1, 1, 1, 1, 1, '{}', 15),
(162, 15, 'logo_facture', 'image', 'Logo Facture', 0, 1, 1, 1, 1, 1, '{}', 16),
(163, 15, 'logo_footer', 'image', 'Logo Footer', 0, 1, 1, 1, 1, 1, '{}', 17),
(164, 15, 'short_description_fr', 'text_area', 'Courte description', 0, 1, 1, 1, 1, 1, '{}', 18),
(165, 15, 'description_fr', 'text_area', 'Description', 0, 1, 1, 1, 1, 1, '{}', 19),
(166, 15, 'created_by', 'text', 'Created By', 0, 0, 0, 0, 0, 0, '{}', 20),
(167, 15, 'updated_by', 'text', 'Updated By', 0, 0, 0, 0, 0, 0, '{}', 21),
(168, 15, 'created_at', 'timestamp', 'Created At', 0, 0, 0, 0, 0, 0, '{}', 22),
(169, 15, 'updated_at', 'timestamp', 'Updated At', 0, 0, 0, 0, 0, 0, '{}', 23),
(170, 16, 'id', 'text', 'Id', 1, 0, 0, 0, 0, 0, '{}', 1),
(171, 16, 'name', 'text', 'Nom et Prénom', 0, 1, 1, 1, 1, 1, '{}', 2),
(172, 16, 'email', 'text', 'Email', 0, 1, 1, 1, 1, 1, '{}', 3),
(173, 16, 'adresse', 'text', 'Adresse', 0, 1, 1, 1, 1, 1, '{}', 4),
(174, 16, 'matricule', 'text', 'Matricule', 0, 1, 1, 1, 1, 1, '{}', 5),
(175, 16, 'phone_1', 'text', 'Téléphone 1', 0, 1, 1, 1, 1, 1, '{}', 6),
(176, 16, 'phone_2', 'text', 'Téléphone 2', 0, 1, 1, 1, 1, 1, '{}', 7),
(177, 16, 'created_by', 'text', 'Created By', 0, 0, 0, 0, 0, 0, '{}', 8),
(178, 16, 'updated_by', 'text', 'Updated By', 0, 0, 0, 0, 0, 0, '{}', 9),
(179, 16, 'created_at', 'timestamp', 'Created At', 0, 0, 1, 0, 0, 0, '{}', 10),
(180, 16, 'updated_at', 'timestamp', 'Updated At', 0, 0, 0, 0, 0, 0, '{}', 11),
(181, 15, 'timbre', 'text', 'Timbre', 0, 1, 1, 1, 1, 1, '{}', 24),
(182, 15, 'tva', 'text', 'TVA', 0, 1, 1, 1, 1, 1, '{}', 25),
(183, 9, 'prix_unitaire', 'text', 'Prix Unitaire', 0, 1, 1, 1, 1, 1, '{}', 10),
(184, 9, 'prix_ht', 'text', 'Prix HT', 0, 1, 1, 1, 1, 1, '{}', 11),
(185, 9, 'prix_ttc', 'text', 'Prix TTC', 0, 1, 1, 1, 1, 1, '{}', 12),
(186, 18, 'id', 'text', 'Id', 1, 0, 0, 0, 0, 0, '{}', 1),
(187, 18, 'designation_fr', 'text', 'Designation Fr', 0, 1, 1, 1, 1, 1, '{}', 2),
(188, 18, 'description_fr', 'text', 'Description Fr', 0, 1, 1, 1, 1, 1, '{}', 3),
(189, 18, 'created_by', 'text', 'Created By', 0, 1, 1, 1, 1, 1, '{}', 4),
(190, 18, 'updated_by', 'text', 'Updated By', 0, 1, 1, 1, 1, 1, '{}', 5),
(191, 18, 'created_at', 'timestamp', 'Created At', 0, 1, 1, 1, 0, 1, '{}', 6),
(192, 18, 'updated_at', 'timestamp', 'Updated At', 0, 0, 0, 0, 0, 0, '{}', 7),
(193, 10, 'sous_category_belongsto_categ_relationship', 'relationship', 'Catégories', 0, 1, 1, 1, 1, 1, '{\"model\":\"App\\\\Categ\",\"table\":\"categs\",\"type\":\"belongsTo\",\"column\":\"categorie_id\",\"key\":\"id\",\"label\":\"designation_fr\",\"pivot_table\":\"categories\",\"pivot\":\"0\",\"taggable\":\"0\"}', 2),
(194, 8, 'product_belongsto_sous_category_relationship', 'relationship', 'sous-catégories', 0, 1, 1, 1, 1, 1, '{\"model\":\"App\\\\SousCategory\",\"table\":\"sous_categories\",\"type\":\"belongsTo\",\"column\":\"sous_categorie_id\",\"key\":\"id\",\"label\":\"designation_fr\",\"pivot_table\":\"categories\",\"pivot\":\"0\",\"taggable\":\"0\"}', 2),
(195, 7, 'facture_belongsto_client_relationship', 'relationship', 'clients', 0, 1, 1, 1, 1, 1, '{\"model\":\"App\\\\Client\",\"table\":\"clients\",\"type\":\"belongsTo\",\"column\":\"client_id\",\"key\":\"id\",\"label\":\"name\",\"pivot_table\":\"categories\",\"pivot\":\"0\",\"taggable\":\"0\"}', 5),
(196, 7, 'pourcentage_remise', 'text', 'Pourcentage Remise', 0, 1, 1, 1, 1, 1, '{}', 8),
(197, 7, 'client_id', 'text', 'Client Id', 0, 1, 1, 1, 1, 1, '{}', 13),
(198, 11, 'ticket_belongsto_client_relationship', 'relationship', 'clients', 0, 1, 1, 1, 1, 1, '{\"model\":\"App\\\\Client\",\"table\":\"clients\",\"type\":\"belongsTo\",\"column\":\"client_id\",\"key\":\"id\",\"label\":\"name\",\"pivot_table\":\"categories\",\"pivot\":\"0\",\"taggable\":\"0\"}', 3),
(199, 11, 'pourcentage_remise', 'text', 'Pourcentage Remise', 0, 1, 1, 1, 1, 1, '{}', 8),
(200, 11, 'timbre', 'text', 'Timbre', 0, 1, 1, 1, 1, 1, '{}', 10),
(201, 11, 'client_id', 'text', 'Client Id', 0, 1, 1, 1, 1, 1, '{}', 4),
(202, 15, 'short_description_ticket', 'text', 'Description Ticket', 0, 1, 1, 1, 1, 1, '{}', 26),
(203, 15, 'footer_ticket', 'text', 'Footer Ticket', 0, 1, 1, 1, 1, 1, '{}', 27),
(204, 8, 'code_product', 'text', 'Code Produit', 0, 1, 1, 1, 1, 1, '{}', 4);

-- --------------------------------------------------------

--
-- Structure de la table `data_types`
--

CREATE TABLE `data_types` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `display_name_singular` varchar(255) NOT NULL,
  `display_name_plural` varchar(255) NOT NULL,
  `icon` varchar(255) DEFAULT NULL,
  `model_name` varchar(255) DEFAULT NULL,
  `policy_name` varchar(255) DEFAULT NULL,
  `controller` varchar(255) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `generate_permissions` tinyint(1) NOT NULL DEFAULT 0,
  `server_side` tinyint(4) NOT NULL DEFAULT 0,
  `details` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `data_types`
--

INSERT INTO `data_types` (`id`, `name`, `slug`, `display_name_singular`, `display_name_plural`, `icon`, `model_name`, `policy_name`, `controller`, `description`, `generate_permissions`, `server_side`, `details`, `created_at`, `updated_at`) VALUES
(1, 'users', 'users', 'User', 'Users', 'voyager-person', 'TCG\\Voyager\\Models\\User', 'TCG\\Voyager\\Policies\\UserPolicy', 'TCG\\Voyager\\Http\\Controllers\\VoyagerUserController', '', 1, 0, NULL, '2023-05-13 10:10:24', '2023-05-13 10:10:24'),
(2, 'menus', 'menus', 'Menu', 'Menus', 'voyager-list', 'TCG\\Voyager\\Models\\Menu', NULL, '', '', 1, 0, NULL, '2023-05-13 10:10:24', '2023-05-13 10:10:24'),
(3, 'roles', 'roles', 'Role', 'Roles', 'voyager-lock', 'TCG\\Voyager\\Models\\Role', NULL, 'TCG\\Voyager\\Http\\Controllers\\VoyagerRoleController', '', 1, 0, NULL, '2023-05-13 10:10:24', '2023-05-13 10:10:24'),
(5, 'posts', 'posts', 'Post', 'Posts', 'voyager-news', 'TCG\\Voyager\\Models\\Post', 'TCG\\Voyager\\Policies\\PostPolicy', '', '', 1, 0, NULL, '2023-05-13 10:10:25', '2023-05-13 10:10:25'),
(6, 'pages', 'pages', 'Page', 'Pages', 'voyager-file-text', 'TCG\\Voyager\\Models\\Page', NULL, '', '', 1, 0, NULL, '2023-05-13 10:10:25', '2023-05-13 10:10:25'),
(7, 'factures', 'factures', 'Facture', 'Factures', NULL, 'App\\Facture', NULL, NULL, NULL, 1, 0, '{\"order_column\":null,\"order_display_column\":null,\"order_direction\":\"asc\",\"default_search_key\":null,\"scope\":null}', '2023-05-13 11:44:59', '2023-05-24 14:57:31'),
(8, 'products', 'produits', 'Produit', 'Produits', NULL, 'App\\Product', NULL, NULL, NULL, 1, 0, '{\"order_column\":null,\"order_display_column\":null,\"order_direction\":\"asc\",\"default_search_key\":null,\"scope\":null}', '2023-05-13 11:54:03', '2023-06-11 13:37:45'),
(9, 'details_factures', 'details-factures', 'Details Facture', 'Details Factures', NULL, 'App\\DetailsFacture', NULL, NULL, NULL, 1, 0, '{\"order_column\":null,\"order_display_column\":null,\"order_direction\":\"asc\",\"default_search_key\":null,\"scope\":null}', '2023-05-13 11:55:49', '2023-05-20 15:09:43'),
(10, 'sous_categories', 'sous-categories', 'Sous Category', 'Sous Categories', NULL, 'App\\SousCategory', NULL, NULL, NULL, 1, 0, '{\"order_column\":null,\"order_display_column\":null,\"order_direction\":\"asc\",\"default_search_key\":null,\"scope\":null}', '2023-05-13 12:02:57', '2023-05-21 13:01:40'),
(11, 'tickets', 'tickets', 'Ticket', 'Tickets', NULL, 'App\\Ticket', NULL, NULL, NULL, 1, 0, '{\"order_column\":null,\"order_display_column\":null,\"order_direction\":\"asc\",\"default_search_key\":null,\"scope\":null}', '2023-05-13 12:07:39', '2023-05-24 15:00:14'),
(12, 'details_tickets', 'details-tickets', 'Details Ticket', 'Details Tickets', NULL, 'App\\DetailsTicket', NULL, NULL, NULL, 1, 0, '{\"order_column\":null,\"order_display_column\":null,\"order_direction\":\"asc\",\"default_search_key\":null}', '2023-05-13 12:10:21', '2023-05-13 12:10:21'),
(13, 'commandes', 'commandes', 'Commande', 'Commandes', NULL, 'App\\Commande', NULL, NULL, NULL, 1, 0, '{\"order_column\":null,\"order_display_column\":null,\"order_direction\":\"asc\",\"default_search_key\":null}', '2023-05-13 12:13:09', '2023-05-13 12:13:09'),
(14, 'commande_details', 'commande-details', 'Commande Detail', 'Commande Details', NULL, 'App\\CommandeDetail', NULL, NULL, NULL, 1, 0, '{\"order_column\":null,\"order_display_column\":null,\"order_direction\":\"asc\",\"default_search_key\":null}', '2023-05-13 12:15:00', '2023-05-13 12:15:00'),
(15, 'coordinates', 'coordonnees', 'Coordonnée', 'Coordonnées', NULL, 'App\\Coordinate', NULL, NULL, NULL, 1, 0, '{\"order_column\":null,\"order_display_column\":null,\"order_direction\":\"asc\",\"default_search_key\":null,\"scope\":null}', '2023-05-20 11:11:02', '2023-06-03 22:10:00'),
(16, 'clients', 'clients', 'Client', 'Clients', NULL, 'App\\Client', NULL, NULL, NULL, 1, 0, '{\"order_column\":null,\"order_display_column\":null,\"order_direction\":\"asc\",\"default_search_key\":null,\"scope\":null}', '2023-05-20 11:51:21', '2023-05-21 13:04:39'),
(18, 'categs', 'categorie', 'Catégorie', 'Catégories', NULL, 'App\\Categ', NULL, NULL, NULL, 1, 0, '{\"order_column\":null,\"order_display_column\":null,\"order_direction\":\"asc\",\"default_search_key\":null}', '2023-05-21 12:54:52', '2023-05-21 12:54:52');

-- --------------------------------------------------------

--
-- Structure de la table `details_factures`
--

CREATE TABLE `details_factures` (
  `id` int(10) UNSIGNED NOT NULL,
  `facture_id` int(11) DEFAULT NULL,
  `produit_id` int(11) DEFAULT NULL,
  `designation` varchar(255) DEFAULT NULL,
  `qte` int(11) DEFAULT NULL,
  `created_by` varchar(255) DEFAULT NULL,
  `updated_by` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `prix_unitaire` double DEFAULT NULL,
  `prix_ht` double DEFAULT NULL,
  `prix_ttc` double DEFAULT NULL,
  `tva` double DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `details_factures`
--

INSERT INTO `details_factures` (`id`, `facture_id`, `produit_id`, `designation`, `qte`, `created_by`, `updated_by`, `created_at`, `updated_at`, `prix_unitaire`, `prix_ht`, `prix_ttc`, `tva`) VALUES
(1, 2, 1, NULL, 1, NULL, NULL, '2023-05-20 15:30:05', '2023-05-20 15:30:05', 10, 10, 11.9, 19),
(20, 5, 1, NULL, 22, NULL, NULL, '2023-05-21 16:12:14', '2023-05-21 16:12:14', 10, 220, 261.8, 19),
(21, 5, 2, NULL, 9, NULL, NULL, '2023-05-21 16:12:14', '2023-05-21 16:12:14', 10, 90, 107.1, 19),
(22, 3, 1, NULL, 9, NULL, NULL, '2023-05-21 16:35:24', '2023-05-21 16:35:24', 10, 90, 107.1, 19),
(23, 3, 2, NULL, 1, NULL, NULL, '2023-05-21 16:35:24', '2023-05-21 16:35:24', 10, 10, 11.9, 19),
(24, 6, 1, NULL, 5, NULL, NULL, '2023-05-21 21:57:13', '2023-05-21 21:57:13', 10, 50, 59.5, 19),
(25, 7, 1, NULL, 2, NULL, NULL, '2023-05-22 18:07:09', '2023-05-22 18:07:09', 10, 20, 23.8, 19),
(26, 7, 2, NULL, 2, NULL, NULL, '2023-05-22 18:07:09', '2023-05-22 18:07:09', 10, 20, 23.8, 19),
(27, 8, 2, NULL, 1, NULL, NULL, '2023-05-22 18:15:30', '2023-05-22 18:15:30', 10, 10, 11.9, 19),
(28, 9, 2, NULL, 1, NULL, NULL, '2023-05-22 18:18:31', '2023-05-22 18:18:31', 10, 10, 11.9, 19),
(29, 10, 1, NULL, 1, NULL, NULL, '2023-05-22 18:19:32', '2023-05-22 18:19:32', 10, 10, 11.9, 19),
(30, 11, 1, NULL, 1, NULL, NULL, '2023-05-22 18:20:03', '2023-05-22 18:20:03', 10, 10, 11.9, 19),
(31, 12, 1, NULL, 1, NULL, NULL, '2023-05-22 18:21:32', '2023-05-22 18:21:32', 10, 10, 11.9, 19),
(32, 13, 1, NULL, 1, NULL, NULL, '2023-05-22 18:24:04', '2023-05-22 18:24:04', 10, 10, 11.9, 19),
(33, 14, 1, NULL, 1, NULL, NULL, '2023-05-22 18:25:56', '2023-05-22 18:25:56', 10, 10, 11.9, 19),
(34, 15, 1, NULL, 1, NULL, NULL, '2023-05-24 13:58:41', '2023-05-24 13:58:41', 10, 10, 11.9, 19),
(35, 16, 2, NULL, 4, NULL, NULL, '2023-05-24 14:38:53', '2023-05-24 14:38:53', 15, 60, 71.4, 19),
(36, 16, 1, NULL, 5, NULL, NULL, '2023-05-24 14:38:53', '2023-05-24 14:38:53', 10, 50, 59.5, 19),
(37, 17, 1, NULL, 1, NULL, NULL, '2023-05-24 14:41:16', '2023-05-24 14:41:16', 10, 10, 11.9, 19),
(38, 17, 2, NULL, 2, NULL, NULL, '2023-05-24 14:41:16', '2023-05-24 14:41:16', 10, 20, 23.8, 19),
(39, 18, 1, NULL, 2, NULL, NULL, '2023-05-24 20:04:55', '2023-05-24 20:04:55', 10, 20, 23.8, 19),
(40, 18, 3, NULL, 5, NULL, NULL, '2023-05-24 20:04:55', '2023-05-24 20:04:55', 10, 50, 59.5, 19),
(41, 19, 4, NULL, 5, NULL, NULL, '2023-05-27 15:56:29', '2023-05-27 15:56:29', 220, NULL, 1100, NULL),
(42, 20, 4, NULL, 5, NULL, NULL, '2023-05-27 15:56:59', '2023-05-27 15:56:59', 220, NULL, 1100, NULL),
(43, 21, 4, NULL, 4, NULL, NULL, '2023-05-27 16:03:45', '2023-05-27 16:03:45', 220, NULL, 880, NULL),
(44, 22, 4, NULL, 5, NULL, NULL, '2023-05-27 16:05:17', '2023-05-27 16:05:17', 220, NULL, 1100, NULL),
(45, 23, 4, NULL, 4, NULL, NULL, '2023-05-27 16:06:48', '2023-05-27 16:06:48', 220, NULL, 880, NULL),
(46, 24, 1, NULL, 5, NULL, NULL, '2023-05-29 17:11:04', '2023-05-29 17:11:04', 11.9, NULL, 59.5, NULL),
(53, 26, 2, NULL, 1, NULL, NULL, '2023-06-03 23:15:28', '2023-06-03 23:15:28', 11.9, NULL, 11.9, NULL),
(54, 27, 2, NULL, 1, NULL, NULL, '2023-06-03 23:20:40', '2023-06-03 23:20:40', 11.9, NULL, 11.9, NULL),
(55, 28, 1, NULL, 1, NULL, NULL, '2023-06-03 23:28:55', '2023-06-03 23:28:55', 11.9, NULL, 11.9, NULL),
(58, 25, 1, NULL, 5, NULL, NULL, '2023-06-10 14:38:35', '2023-06-10 14:38:35', 11.9, NULL, 59.5, NULL),
(59, 25, 3, NULL, 5, NULL, NULL, '2023-06-10 14:38:35', '2023-06-10 14:38:35', 10, NULL, 50, NULL);

-- --------------------------------------------------------

--
-- Structure de la table `details_tickets`
--

CREATE TABLE `details_tickets` (
  `id` int(10) UNSIGNED NOT NULL,
  `ticket_id` int(11) DEFAULT NULL,
  `produit_id` int(11) DEFAULT NULL,
  `designation_fr` varchar(255) DEFAULT NULL,
  `qte` double DEFAULT NULL,
  `created_by` varchar(255) DEFAULT NULL,
  `updated_by` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `prix_unitaire` double DEFAULT NULL,
  `prix_ht` double DEFAULT NULL,
  `tva` double DEFAULT NULL,
  `prix_ttc` double DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `details_tickets`
--

INSERT INTO `details_tickets` (`id`, `ticket_id`, `produit_id`, `designation_fr`, `qte`, `created_by`, `updated_by`, `created_at`, `updated_at`, `prix_unitaire`, `prix_ht`, `tva`, `prix_ttc`) VALUES
(1, 2, 1, NULL, 1, NULL, NULL, '2023-05-22 15:53:44', '2023-05-22 15:53:44', 10, 10, 19, 11.9),
(2, 4, 1, NULL, 1, NULL, NULL, '2023-05-24 15:02:32', '2023-05-24 15:02:32', 10, 10, 19, 11.9),
(3, 4, 2, NULL, 4, NULL, NULL, '2023-05-24 15:02:32', '2023-05-24 15:02:32', 10, 40, 19, 47.6),
(5, 6, 1, NULL, 1, NULL, NULL, '2023-06-03 22:04:17', '2023-06-03 22:04:17', 11.9, NULL, NULL, 11.9),
(6, 6, 3, NULL, 2, NULL, NULL, '2023-06-03 22:04:17', '2023-06-03 22:04:17', 10, NULL, NULL, 20),
(7, 6, 4, NULL, 1, NULL, NULL, '2023-06-03 22:04:17', '2023-06-03 22:04:17', 220, NULL, NULL, 220),
(10, 5, 1, NULL, 2, NULL, NULL, '2023-06-10 14:42:12', '2023-06-10 14:42:12', 10, NULL, NULL, 20),
(11, 5, 2, NULL, 2, NULL, NULL, '2023-06-10 14:42:12', '2023-06-10 14:42:12', 11.9, NULL, NULL, 23.8),
(12, 7, 5, NULL, 1, NULL, NULL, '2023-06-10 14:53:39', '2023-06-10 14:53:39', 140, NULL, NULL, 140);

-- --------------------------------------------------------

--
-- Structure de la table `factures`
--

CREATE TABLE `factures` (
  `id` int(10) UNSIGNED NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `remise` double DEFAULT NULL,
  `prix_ht` double DEFAULT NULL,
  `prix_ttc` double DEFAULT NULL,
  `tva` double DEFAULT NULL,
  `timbre` double DEFAULT NULL,
  `numero` varchar(255) DEFAULT NULL,
  `created_by` varchar(255) DEFAULT NULL,
  `updated_by` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `pourcentage_remise` int(11) DEFAULT NULL,
  `client_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `factures`
--

INSERT INTO `factures` (`id`, `user_id`, `remise`, `prix_ht`, `prix_ttc`, `tva`, `timbre`, `numero`, `created_by`, `updated_by`, `created_at`, `updated_at`, `pourcentage_remise`, `client_id`) VALUES
(15, NULL, 0, 10, 12.9, 1.9, 1, '2023/0005', NULL, NULL, '2023-05-24 13:58:41', '2023-05-24 13:58:41', 0, 11),
(16, NULL, 10, 110, 120, 19, 1, '2023/0006', NULL, NULL, '2023-05-24 14:38:53', '2023-05-24 14:38:53', 9, 12),
(18, NULL, 10, 70, 72.4, 11.4, 1, '2023/0003', NULL, NULL, '2023-05-24 20:04:55', '2023-05-24 20:04:55', 14, 11),
(19, NULL, 110, NULL, 990, NULL, NULL, '2023/0004', NULL, NULL, '2023-05-27 15:56:29', '2023-05-27 15:56:29', 10, NULL),
(20, NULL, 110, NULL, 990, NULL, NULL, '2023/0005', NULL, NULL, '2023-05-27 15:56:59', '2023-05-27 15:56:59', 10, NULL),
(21, NULL, 80, NULL, 800, NULL, NULL, '2023/0006', NULL, NULL, '2023-05-27 16:03:45', '2023-05-27 16:03:45', 9, 11),
(22, NULL, 50, NULL, 1050, NULL, NULL, '2023/0007', NULL, NULL, '2023-05-27 16:05:17', '2023-05-27 16:05:17', 5, 11),
(23, NULL, 30, 880, 850, NULL, NULL, '2023/0008', NULL, NULL, '2023-05-27 16:06:48', '2023-05-27 16:06:48', 3, 11),
(24, NULL, 5.95, 59.5, 53.55, NULL, NULL, '2023/0009', NULL, NULL, '2023-05-29 17:11:04', '2023-05-29 17:11:04', 10, 13),
(25, NULL, 10, 109.5, 99.5, 18.905, NULL, '2023/0010', NULL, NULL, '2023-06-03 17:21:33', '2023-06-10 14:38:35', 9, 12),
(26, NULL, 0, 11.9, 11.9, NULL, NULL, '2023/0011', NULL, NULL, '2023-06-03 23:15:28', '2023-06-03 23:15:28', 0, NULL),
(27, NULL, 0, 11.9, 11.9, NULL, NULL, '2023/0012', NULL, NULL, '2023-06-03 23:20:40', '2023-06-03 23:20:40', 0, 11),
(28, NULL, 0, 11.9, 11.9, NULL, NULL, '2023/0013', NULL, NULL, '2023-06-03 23:28:55', '2023-06-03 23:28:55', 0, 11);

-- --------------------------------------------------------

--
-- Structure de la table `failed_jobs`
--

CREATE TABLE `failed_jobs` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `uuid` varchar(255) NOT NULL,
  `connection` text NOT NULL,
  `queue` text NOT NULL,
  `payload` longtext NOT NULL,
  `exception` longtext NOT NULL,
  `failed_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structure de la table `menus`
--

CREATE TABLE `menus` (
  `id` int(10) UNSIGNED NOT NULL,
  `name` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `menus`
--

INSERT INTO `menus` (`id`, `name`, `created_at`, `updated_at`) VALUES
(1, 'admin', '2023-05-13 10:10:24', '2023-05-13 10:10:24');

-- --------------------------------------------------------

--
-- Structure de la table `menu_items`
--

CREATE TABLE `menu_items` (
  `id` int(10) UNSIGNED NOT NULL,
  `menu_id` int(10) UNSIGNED DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `url` varchar(255) NOT NULL,
  `target` varchar(255) NOT NULL DEFAULT '_self',
  `icon_class` varchar(255) DEFAULT NULL,
  `color` varchar(255) DEFAULT NULL,
  `parent_id` int(11) DEFAULT NULL,
  `order` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `route` varchar(255) DEFAULT NULL,
  `parameters` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `menu_items`
--

INSERT INTO `menu_items` (`id`, `menu_id`, `title`, `url`, `target`, `icon_class`, `color`, `parent_id`, `order`, `created_at`, `updated_at`, `route`, `parameters`) VALUES
(1, 1, 'Accueil', '', '_self', 'voyager-play', '#000000', NULL, 1, '2023-05-13 10:10:24', '2023-05-24 18:14:28', 'voyager.dashboard', 'null'),
(2, 1, 'Media', '', '_self', 'voyager-images', NULL, NULL, 4, '2023-05-13 10:10:24', '2023-05-21 13:10:54', 'voyager.media.index', NULL),
(3, 1, 'Users', '', '_self', 'voyager-person', NULL, NULL, 3, '2023-05-13 10:10:24', '2023-05-13 10:10:24', 'voyager.users.index', NULL),
(4, 1, 'Roles', '', '_self', 'voyager-lock', NULL, NULL, 2, '2023-05-13 10:10:24', '2023-05-13 10:10:24', 'voyager.roles.index', NULL),
(5, 1, 'Tools', '', '_self', 'voyager-tools', NULL, NULL, 7, '2023-05-13 10:10:24', '2023-05-21 13:10:54', NULL, NULL),
(6, 1, 'Menu Builder', '', '_self', 'voyager-list', NULL, 5, 1, '2023-05-13 10:10:24', '2023-05-21 13:10:54', 'voyager.menus.index', NULL),
(7, 1, 'Database', '', '_self', 'voyager-data', NULL, 5, 2, '2023-05-13 10:10:24', '2023-05-21 13:10:54', 'voyager.database.index', NULL),
(8, 1, 'Compass', '', '_self', 'voyager-compass', NULL, 5, 3, '2023-05-13 10:10:24', '2023-05-21 13:10:54', 'voyager.compass.index', NULL),
(9, 1, 'BREAD', '', '_self', 'voyager-bread', NULL, 5, 4, '2023-05-13 10:10:24', '2023-05-21 13:10:54', 'voyager.bread.index', NULL),
(10, 1, 'Settings', '', '_self', 'voyager-settings', NULL, NULL, 8, '2023-05-13 10:10:24', '2023-05-21 13:10:54', 'voyager.settings.index', NULL),
(12, 1, 'Posts', '', '_self', 'voyager-news', NULL, NULL, 5, '2023-05-13 10:10:25', '2023-05-21 13:10:54', 'voyager.posts.index', NULL),
(13, 1, 'Pages', '', '_self', 'voyager-file-text', NULL, NULL, 6, '2023-05-13 10:10:25', '2023-05-21 13:10:54', 'voyager.pages.index', NULL),
(14, 1, 'Factures', '', '_self', 'voyager-file-text', '#000000', 26, 2, '2023-05-13 11:44:59', '2023-05-21 13:11:25', 'voyager.factures.index', 'null'),
(15, 1, 'Produits', '', '_self', 'voyager-shop', '#000000', NULL, 9, '2023-05-13 11:54:03', '2023-05-21 13:11:25', 'voyager.produits.index', 'null'),
(16, 1, 'Details Factures', '', '_self', NULL, NULL, NULL, 10, '2023-05-13 11:55:49', '2023-05-21 13:11:25', 'voyager.details-factures.index', NULL),
(17, 1, 'Sous Categories', '', '_self', 'voyager-list', '#000000', NULL, 11, '2023-05-13 12:02:57', '2023-05-21 13:11:25', 'voyager.sous-categories.index', 'null'),
(18, 1, 'Tickets', '', '_self', 'voyager-receipt', '#000000', 26, 4, '2023-05-13 12:07:39', '2023-05-21 13:12:32', 'voyager.tickets.index', 'null'),
(19, 1, 'Details Tickets', '', '_self', NULL, NULL, NULL, 12, '2023-05-13 12:10:21', '2023-05-21 13:11:25', 'voyager.details-tickets.index', NULL),
(20, 1, 'Commandes', '', '_self', 'voyager-basket', '#000000', NULL, 13, '2023-05-13 12:13:09', '2023-05-21 13:11:25', 'voyager.commandes.index', 'null'),
(21, 1, 'Commande Details', '', '_self', NULL, NULL, NULL, 14, '2023-05-13 12:15:00', '2023-05-21 13:11:25', 'voyager.commande-details.index', NULL),
(22, 1, 'Coordonnées', '', '_self', 'voyager-tag', '#000000', NULL, 15, '2023-05-20 11:11:02', '2023-05-21 13:11:25', 'voyager.coordonnees.index', 'null'),
(23, 1, 'Clients', '', '_self', 'voyager-group', '#000000', NULL, 16, '2023-05-20 11:51:21', '2023-05-21 13:11:25', 'voyager.clients.index', 'null'),
(24, 1, 'Catégories', '', '_self', 'voyager-categories', '#000000', NULL, 17, '2023-05-21 12:54:52', '2023-05-21 13:11:25', 'voyager.categorie.index', 'null'),
(25, 1, 'Ajouter facture', '', '_self', 'voyager-plus', '#000000', 26, 1, '2023-05-21 13:09:20', '2023-05-21 13:13:23', 'voyager.facture', 'null'),
(26, 1, 'Module Financier', '', '_self', 'voyager-dollar', '#000000', NULL, 18, '2023-05-21 13:10:45', '2023-05-22 15:38:35', NULL, ''),
(27, 1, 'Ajouter ticket', '', '_self', 'voyager-plus', '#000000', 26, 3, '2023-05-21 13:12:23', '2023-05-21 13:24:29', 'voyager.ticket', 'null');

-- --------------------------------------------------------

--
-- Structure de la table `migrations`
--

CREATE TABLE `migrations` (
  `id` int(10) UNSIGNED NOT NULL,
  `migration` varchar(255) NOT NULL,
  `batch` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `migrations`
--

INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES
(1, '2014_10_12_000000_create_users_table', 1),
(2, '2014_10_12_100000_create_password_resets_table', 1),
(3, '2016_01_01_000000_add_voyager_user_fields', 1),
(4, '2016_01_01_000000_create_data_types_table', 1),
(5, '2016_05_19_173453_create_menu_table', 1),
(6, '2016_10_21_190000_create_roles_table', 1),
(7, '2016_10_21_190000_create_settings_table', 1),
(8, '2016_11_30_135954_create_permission_table', 1),
(9, '2016_11_30_141208_create_permission_role_table', 1),
(10, '2016_12_26_201236_data_types__add__server_side', 1),
(11, '2017_01_13_000000_add_route_to_menu_items_table', 1),
(12, '2017_01_14_005015_create_translations_table', 1),
(13, '2017_01_15_000000_make_table_name_nullable_in_permissions_table', 1),
(14, '2017_03_06_000000_add_controller_to_data_types_table', 1),
(15, '2017_04_21_000000_add_order_to_data_rows_table', 1),
(16, '2017_07_05_210000_add_policyname_to_data_types_table', 1),
(17, '2017_08_05_000000_add_group_to_settings_table', 1),
(18, '2017_11_26_013050_add_user_role_relationship', 1),
(19, '2017_11_26_015000_create_user_roles_table', 1),
(20, '2018_03_11_000000_add_user_settings', 1),
(21, '2018_03_14_000000_add_details_to_data_types_table', 1),
(22, '2018_03_16_000000_make_settings_value_nullable', 1),
(23, '2019_08_19_000000_create_failed_jobs_table', 1),
(24, '2019_12_14_000001_create_personal_access_tokens_table', 1),
(25, '2016_01_01_000000_create_pages_table', 2),
(26, '2016_01_01_000000_create_posts_table', 2),
(27, '2016_02_15_204651_create_categories_table', 2),
(28, '2017_04_11_000000_alter_post_nullable_fields_table', 2);

-- --------------------------------------------------------

--
-- Structure de la table `pages`
--

CREATE TABLE `pages` (
  `id` int(10) UNSIGNED NOT NULL,
  `author_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `excerpt` text DEFAULT NULL,
  `body` text DEFAULT NULL,
  `image` varchar(255) DEFAULT NULL,
  `slug` varchar(255) NOT NULL,
  `meta_description` text DEFAULT NULL,
  `meta_keywords` text DEFAULT NULL,
  `status` enum('ACTIVE','INACTIVE') NOT NULL DEFAULT 'INACTIVE',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `pages`
--

INSERT INTO `pages` (`id`, `author_id`, `title`, `excerpt`, `body`, `image`, `slug`, `meta_description`, `meta_keywords`, `status`, `created_at`, `updated_at`) VALUES
(1, 0, 'Hello World', 'Hang the jib grog grog blossom grapple dance the hempen jig gangway pressgang bilge rat to go on account lugger. Nelsons folly gabion line draught scallywag fire ship gaff fluke fathom case shot. Sea Legs bilge rat sloop matey gabion long clothes run a shot across the bow Gold Road cog league.', '<p>Hello World. Scallywag grog swab Cat o\'nine tails scuttle rigging hardtack cable nipper Yellow Jack. Handsomely spirits knave lad killick landlubber or just lubber deadlights chantey pinnace crack Jennys tea cup. Provost long clothes black spot Yellow Jack bilged on her anchor league lateen sail case shot lee tackle.</p>\n<p>Ballast spirits fluke topmast me quarterdeck schooner landlubber or just lubber gabion belaying pin. Pinnace stern galleon starboard warp carouser to go on account dance the hempen jig jolly boat measured fer yer chains. Man-of-war fire in the hole nipperkin handsomely doubloon barkadeer Brethren of the Coast gibbet driver squiffy.</p>', 'pages/page1.jpg', 'hello-world', 'Yar Meta Description', 'Keyword1, Keyword2', 'ACTIVE', '2023-05-13 10:10:25', '2023-05-13 10:10:25');

-- --------------------------------------------------------

--
-- Structure de la table `password_resets`
--

CREATE TABLE `password_resets` (
  `email` varchar(255) NOT NULL,
  `token` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structure de la table `permissions`
--

CREATE TABLE `permissions` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `key` varchar(255) NOT NULL,
  `table_name` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `permissions`
--

INSERT INTO `permissions` (`id`, `key`, `table_name`, `created_at`, `updated_at`) VALUES
(1, 'browse_admin', NULL, '2023-05-13 10:10:24', '2023-05-13 10:10:24'),
(2, 'browse_bread', NULL, '2023-05-13 10:10:24', '2023-05-13 10:10:24'),
(3, 'browse_database', NULL, '2023-05-13 10:10:24', '2023-05-13 10:10:24'),
(4, 'browse_media', NULL, '2023-05-13 10:10:24', '2023-05-13 10:10:24'),
(5, 'browse_compass', NULL, '2023-05-13 10:10:24', '2023-05-13 10:10:24'),
(6, 'browse_menus', 'menus', '2023-05-13 10:10:24', '2023-05-13 10:10:24'),
(7, 'read_menus', 'menus', '2023-05-13 10:10:24', '2023-05-13 10:10:24'),
(8, 'edit_menus', 'menus', '2023-05-13 10:10:24', '2023-05-13 10:10:24'),
(9, 'add_menus', 'menus', '2023-05-13 10:10:24', '2023-05-13 10:10:24'),
(10, 'delete_menus', 'menus', '2023-05-13 10:10:24', '2023-05-13 10:10:24'),
(11, 'browse_roles', 'roles', '2023-05-13 10:10:24', '2023-05-13 10:10:24'),
(12, 'read_roles', 'roles', '2023-05-13 10:10:24', '2023-05-13 10:10:24'),
(13, 'edit_roles', 'roles', '2023-05-13 10:10:24', '2023-05-13 10:10:24'),
(14, 'add_roles', 'roles', '2023-05-13 10:10:24', '2023-05-13 10:10:24'),
(15, 'delete_roles', 'roles', '2023-05-13 10:10:24', '2023-05-13 10:10:24'),
(16, 'browse_users', 'users', '2023-05-13 10:10:24', '2023-05-13 10:10:24'),
(17, 'read_users', 'users', '2023-05-13 10:10:24', '2023-05-13 10:10:24'),
(18, 'edit_users', 'users', '2023-05-13 10:10:24', '2023-05-13 10:10:24'),
(19, 'add_users', 'users', '2023-05-13 10:10:24', '2023-05-13 10:10:24'),
(20, 'delete_users', 'users', '2023-05-13 10:10:24', '2023-05-13 10:10:24'),
(21, 'browse_settings', 'settings', '2023-05-13 10:10:24', '2023-05-13 10:10:24'),
(22, 'read_settings', 'settings', '2023-05-13 10:10:24', '2023-05-13 10:10:24'),
(23, 'edit_settings', 'settings', '2023-05-13 10:10:24', '2023-05-13 10:10:24'),
(24, 'add_settings', 'settings', '2023-05-13 10:10:24', '2023-05-13 10:10:24'),
(25, 'delete_settings', 'settings', '2023-05-13 10:10:24', '2023-05-13 10:10:24'),
(31, 'browse_posts', 'posts', '2023-05-13 10:10:25', '2023-05-13 10:10:25'),
(32, 'read_posts', 'posts', '2023-05-13 10:10:25', '2023-05-13 10:10:25'),
(33, 'edit_posts', 'posts', '2023-05-13 10:10:25', '2023-05-13 10:10:25'),
(34, 'add_posts', 'posts', '2023-05-13 10:10:25', '2023-05-13 10:10:25'),
(35, 'delete_posts', 'posts', '2023-05-13 10:10:25', '2023-05-13 10:10:25'),
(36, 'browse_pages', 'pages', '2023-05-13 10:10:25', '2023-05-13 10:10:25'),
(37, 'read_pages', 'pages', '2023-05-13 10:10:25', '2023-05-13 10:10:25'),
(38, 'edit_pages', 'pages', '2023-05-13 10:10:25', '2023-05-13 10:10:25'),
(39, 'add_pages', 'pages', '2023-05-13 10:10:25', '2023-05-13 10:10:25'),
(40, 'delete_pages', 'pages', '2023-05-13 10:10:25', '2023-05-13 10:10:25'),
(41, 'browse_factures', 'factures', '2023-05-13 11:44:59', '2023-05-13 11:44:59'),
(42, 'read_factures', 'factures', '2023-05-13 11:44:59', '2023-05-13 11:44:59'),
(43, 'edit_factures', 'factures', '2023-05-13 11:44:59', '2023-05-13 11:44:59'),
(44, 'add_factures', 'factures', '2023-05-13 11:44:59', '2023-05-13 11:44:59'),
(45, 'delete_factures', 'factures', '2023-05-13 11:44:59', '2023-05-13 11:44:59'),
(46, 'browse_products', 'products', '2023-05-13 11:54:03', '2023-05-13 11:54:03'),
(47, 'read_products', 'products', '2023-05-13 11:54:03', '2023-05-13 11:54:03'),
(48, 'edit_products', 'products', '2023-05-13 11:54:03', '2023-05-13 11:54:03'),
(49, 'add_products', 'products', '2023-05-13 11:54:03', '2023-05-13 11:54:03'),
(50, 'delete_products', 'products', '2023-05-13 11:54:03', '2023-05-13 11:54:03'),
(51, 'browse_details_factures', 'details_factures', '2023-05-13 11:55:49', '2023-05-13 11:55:49'),
(52, 'read_details_factures', 'details_factures', '2023-05-13 11:55:49', '2023-05-13 11:55:49'),
(53, 'edit_details_factures', 'details_factures', '2023-05-13 11:55:49', '2023-05-13 11:55:49'),
(54, 'add_details_factures', 'details_factures', '2023-05-13 11:55:49', '2023-05-13 11:55:49'),
(55, 'delete_details_factures', 'details_factures', '2023-05-13 11:55:49', '2023-05-13 11:55:49'),
(56, 'browse_sous_categories', 'sous_categories', '2023-05-13 12:02:57', '2023-05-13 12:02:57'),
(57, 'read_sous_categories', 'sous_categories', '2023-05-13 12:02:57', '2023-05-13 12:02:57'),
(58, 'edit_sous_categories', 'sous_categories', '2023-05-13 12:02:57', '2023-05-13 12:02:57'),
(59, 'add_sous_categories', 'sous_categories', '2023-05-13 12:02:57', '2023-05-13 12:02:57'),
(60, 'delete_sous_categories', 'sous_categories', '2023-05-13 12:02:57', '2023-05-13 12:02:57'),
(61, 'browse_tickets', 'tickets', '2023-05-13 12:07:39', '2023-05-13 12:07:39'),
(62, 'read_tickets', 'tickets', '2023-05-13 12:07:39', '2023-05-13 12:07:39'),
(63, 'edit_tickets', 'tickets', '2023-05-13 12:07:39', '2023-05-13 12:07:39'),
(64, 'add_tickets', 'tickets', '2023-05-13 12:07:39', '2023-05-13 12:07:39'),
(65, 'delete_tickets', 'tickets', '2023-05-13 12:07:39', '2023-05-13 12:07:39'),
(66, 'browse_details_tickets', 'details_tickets', '2023-05-13 12:10:21', '2023-05-13 12:10:21'),
(67, 'read_details_tickets', 'details_tickets', '2023-05-13 12:10:21', '2023-05-13 12:10:21'),
(68, 'edit_details_tickets', 'details_tickets', '2023-05-13 12:10:21', '2023-05-13 12:10:21'),
(69, 'add_details_tickets', 'details_tickets', '2023-05-13 12:10:21', '2023-05-13 12:10:21'),
(70, 'delete_details_tickets', 'details_tickets', '2023-05-13 12:10:21', '2023-05-13 12:10:21'),
(71, 'browse_commandes', 'commandes', '2023-05-13 12:13:09', '2023-05-13 12:13:09'),
(72, 'read_commandes', 'commandes', '2023-05-13 12:13:09', '2023-05-13 12:13:09'),
(73, 'edit_commandes', 'commandes', '2023-05-13 12:13:09', '2023-05-13 12:13:09'),
(74, 'add_commandes', 'commandes', '2023-05-13 12:13:09', '2023-05-13 12:13:09'),
(75, 'delete_commandes', 'commandes', '2023-05-13 12:13:09', '2023-05-13 12:13:09'),
(76, 'browse_commande_details', 'commande_details', '2023-05-13 12:15:00', '2023-05-13 12:15:00'),
(77, 'read_commande_details', 'commande_details', '2023-05-13 12:15:00', '2023-05-13 12:15:00'),
(78, 'edit_commande_details', 'commande_details', '2023-05-13 12:15:00', '2023-05-13 12:15:00'),
(79, 'add_commande_details', 'commande_details', '2023-05-13 12:15:00', '2023-05-13 12:15:00'),
(80, 'delete_commande_details', 'commande_details', '2023-05-13 12:15:00', '2023-05-13 12:15:00'),
(81, 'browse_coordinates', 'coordinates', '2023-05-20 11:11:02', '2023-05-20 11:11:02'),
(82, 'read_coordinates', 'coordinates', '2023-05-20 11:11:02', '2023-05-20 11:11:02'),
(83, 'edit_coordinates', 'coordinates', '2023-05-20 11:11:02', '2023-05-20 11:11:02'),
(84, 'add_coordinates', 'coordinates', '2023-05-20 11:11:02', '2023-05-20 11:11:02'),
(85, 'delete_coordinates', 'coordinates', '2023-05-20 11:11:02', '2023-05-20 11:11:02'),
(86, 'browse_clients', 'clients', '2023-05-20 11:51:21', '2023-05-20 11:51:21'),
(87, 'read_clients', 'clients', '2023-05-20 11:51:21', '2023-05-20 11:51:21'),
(88, 'edit_clients', 'clients', '2023-05-20 11:51:21', '2023-05-20 11:51:21'),
(89, 'add_clients', 'clients', '2023-05-20 11:51:21', '2023-05-20 11:51:21'),
(90, 'delete_clients', 'clients', '2023-05-20 11:51:21', '2023-05-20 11:51:21'),
(91, 'browse_categs', 'categs', '2023-05-21 12:54:52', '2023-05-21 12:54:52'),
(92, 'read_categs', 'categs', '2023-05-21 12:54:52', '2023-05-21 12:54:52'),
(93, 'edit_categs', 'categs', '2023-05-21 12:54:52', '2023-05-21 12:54:52'),
(94, 'add_categs', 'categs', '2023-05-21 12:54:52', '2023-05-21 12:54:52'),
(95, 'delete_categs', 'categs', '2023-05-21 12:54:52', '2023-05-21 12:54:52');

-- --------------------------------------------------------

--
-- Structure de la table `permission_role`
--

CREATE TABLE `permission_role` (
  `permission_id` bigint(20) UNSIGNED NOT NULL,
  `role_id` bigint(20) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `permission_role`
--

INSERT INTO `permission_role` (`permission_id`, `role_id`) VALUES
(1, 1),
(1, 3),
(2, 1),
(3, 1),
(4, 1),
(5, 1),
(6, 1),
(7, 1),
(8, 1),
(9, 1),
(10, 1),
(11, 1),
(12, 1),
(13, 1),
(14, 1),
(15, 1),
(16, 1),
(17, 1),
(18, 1),
(19, 1),
(20, 1),
(21, 1),
(22, 1),
(23, 1),
(24, 1),
(25, 1),
(31, 1),
(32, 1),
(33, 1),
(34, 1),
(35, 1),
(36, 1),
(37, 1),
(38, 1),
(39, 1),
(40, 1),
(41, 1),
(41, 3),
(42, 1),
(42, 3),
(43, 1),
(43, 3),
(44, 1),
(44, 3),
(45, 1),
(46, 1),
(46, 3),
(47, 1),
(47, 3),
(48, 1),
(48, 3),
(49, 1),
(49, 3),
(50, 1),
(50, 3),
(51, 1),
(52, 1),
(53, 1),
(54, 1),
(55, 1),
(56, 1),
(56, 3),
(57, 1),
(57, 3),
(58, 1),
(58, 3),
(59, 1),
(59, 3),
(60, 1),
(60, 3),
(61, 1),
(61, 3),
(62, 1),
(62, 3),
(63, 1),
(63, 3),
(64, 1),
(64, 3),
(65, 1),
(66, 1),
(67, 1),
(68, 1),
(69, 1),
(70, 1),
(71, 1),
(72, 1),
(73, 1),
(74, 1),
(75, 1),
(76, 1),
(77, 1),
(78, 1),
(79, 1),
(80, 1),
(81, 1),
(81, 3),
(82, 1),
(82, 3),
(83, 1),
(83, 3),
(84, 1),
(85, 1),
(86, 1),
(86, 3),
(87, 1),
(87, 3),
(88, 1),
(88, 3),
(89, 1),
(89, 3),
(90, 1),
(90, 3),
(91, 1),
(91, 3),
(92, 1),
(92, 3),
(93, 1),
(93, 3),
(94, 1),
(94, 3),
(95, 1),
(95, 3);

-- --------------------------------------------------------

--
-- Structure de la table `personal_access_tokens`
--

CREATE TABLE `personal_access_tokens` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `tokenable_type` varchar(255) NOT NULL,
  `tokenable_id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(255) NOT NULL,
  `token` varchar(64) NOT NULL,
  `abilities` text DEFAULT NULL,
  `last_used_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structure de la table `posts`
--

CREATE TABLE `posts` (
  `id` int(10) UNSIGNED NOT NULL,
  `author_id` int(11) NOT NULL,
  `category_id` int(11) DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `seo_title` varchar(255) DEFAULT NULL,
  `excerpt` text DEFAULT NULL,
  `body` text NOT NULL,
  `image` varchar(255) DEFAULT NULL,
  `slug` varchar(255) NOT NULL,
  `meta_description` text DEFAULT NULL,
  `meta_keywords` text DEFAULT NULL,
  `status` enum('PUBLISHED','DRAFT','PENDING') NOT NULL DEFAULT 'DRAFT',
  `featured` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `posts`
--

INSERT INTO `posts` (`id`, `author_id`, `category_id`, `title`, `seo_title`, `excerpt`, `body`, `image`, `slug`, `meta_description`, `meta_keywords`, `status`, `featured`, `created_at`, `updated_at`) VALUES
(1, 0, NULL, 'Lorem Ipsum Post', NULL, 'This is the excerpt for the Lorem Ipsum Post', '<p>This is the body of the lorem ipsum post</p>', 'posts/post1.jpg', 'lorem-ipsum-post', 'This is the meta description', 'keyword1, keyword2, keyword3', 'PUBLISHED', 0, '2023-05-13 10:10:25', '2023-05-13 10:10:25'),
(2, 0, NULL, 'My Sample Post', NULL, 'This is the excerpt for the sample Post', '<p>This is the body for the sample post, which includes the body.</p>\n                <h2>We can use all kinds of format!</h2>\n                <p>And include a bunch of other stuff.</p>', 'posts/post2.jpg', 'my-sample-post', 'Meta Description for sample post', 'keyword1, keyword2, keyword3', 'PUBLISHED', 0, '2023-05-13 10:10:25', '2023-05-13 10:10:25'),
(3, 0, NULL, 'Latest Post', NULL, 'This is the excerpt for the latest post', '<p>This is the body for the latest post</p>', 'posts/post3.jpg', 'latest-post', 'This is the meta description', 'keyword1, keyword2, keyword3', 'PUBLISHED', 0, '2023-05-13 10:10:25', '2023-05-13 10:10:25'),
(4, 0, NULL, 'Yarr Post', NULL, 'Reef sails nipperkin bring a spring upon her cable coffer jury mast spike marooned Pieces of Eight poop deck pillage. Clipper driver coxswain galleon hempen halter come about pressgang gangplank boatswain swing the lead. Nipperkin yard skysail swab lanyard Blimey bilge water ho quarter Buccaneer.', '<p>Swab deadlights Buccaneer fire ship square-rigged dance the hempen jig weigh anchor cackle fruit grog furl. Crack Jennys tea cup chase guns pressgang hearties spirits hogshead Gold Road six pounders fathom measured fer yer chains. Main sheet provost come about trysail barkadeer crimp scuttle mizzenmast brig plunder.</p>\n<p>Mizzen league keelhaul galleon tender cog chase Barbary Coast doubloon crack Jennys tea cup. Blow the man down lugsail fire ship pinnace cackle fruit line warp Admiral of the Black strike colors doubloon. Tackle Jack Ketch come about crimp rum draft scuppers run a shot across the bow haul wind maroon.</p>\n<p>Interloper heave down list driver pressgang holystone scuppers tackle scallywag bilged on her anchor. Jack Tar interloper draught grapple mizzenmast hulk knave cable transom hogshead. Gaff pillage to go on account grog aft chase guns piracy yardarm knave clap of thunder.</p>', 'posts/post4.jpg', 'yarr-post', 'this be a meta descript', 'keyword1, keyword2, keyword3', 'PUBLISHED', 0, '2023-05-13 10:10:25', '2023-05-13 10:10:25');

-- --------------------------------------------------------

--
-- Structure de la table `products`
--

CREATE TABLE `products` (
  `id` int(10) UNSIGNED NOT NULL,
  `sous_categorie_id` int(11) DEFAULT NULL,
  `designation_fr` varchar(255) DEFAULT NULL,
  `cover` varchar(255) DEFAULT NULL,
  `qte` int(11) DEFAULT NULL,
  `prix_ht` double DEFAULT NULL,
  `prix` double DEFAULT NULL,
  `promo_ht` double DEFAULT NULL,
  `promo` double DEFAULT NULL,
  `description_fr` text DEFAULT NULL,
  `publier` int(11) DEFAULT NULL,
  `created_by` varchar(255) DEFAULT NULL,
  `updated_by` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `code_product` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `products`
--

INSERT INTO `products` (`id`, `sous_categorie_id`, `designation_fr`, `cover`, `qte`, `prix_ht`, `prix`, `promo_ht`, `promo`, `description_fr`, `publier`, `created_by`, `updated_by`, `created_at`, `updated_at`, `code_product`) VALUES
(1, NULL, 'BCAA', NULL, 13, 10, 11.9, 2, 2, 'Description du produit', 1, NULL, NULL, '2023-05-14 14:25:12', '2023-06-10 14:42:12', NULL),
(2, NULL, 'Creatine', NULL, 11, 10, 11.9, 2, 2, 'Description du produit numéro 1', 1, NULL, NULL, '2023-05-14 14:25:27', '2023-06-10 14:42:12', NULL),
(3, NULL, 'masse gainer', 'produits\\May2023\\3MQj1dJQVbPHBe5oGkSR.jpg', 18, 10, 10, NULL, NULL, NULL, 1, NULL, NULL, '2023-05-24 19:57:21', '2023-06-10 14:38:35', NULL),
(4, NULL, 'Whey', NULL, 6, NULL, 220, NULL, NULL, 'test', 1, NULL, NULL, '2023-05-27 15:32:22', '2023-06-03 22:04:17', NULL),
(5, NULL, 'PUMP PRE WORKOUT 300 GR OSTROVIT', NULL, 499, NULL, 140, NULL, NULL, NULL, 1, NULL, NULL, '2023-06-10 14:53:16', '2023-06-10 14:53:39', NULL);

-- --------------------------------------------------------

--
-- Structure de la table `roles`
--

CREATE TABLE `roles` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(255) NOT NULL,
  `display_name` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `roles`
--

INSERT INTO `roles` (`id`, `name`, `display_name`, `created_at`, `updated_at`) VALUES
(1, 'admin', 'Administrator', '2023-05-13 10:10:24', '2023-05-13 10:10:24'),
(2, 'user', 'Normal User', '2023-05-13 10:10:24', '2023-05-13 10:10:24'),
(3, 'webmaster', 'webmaster', '2023-05-22 17:59:39', '2023-05-22 17:59:39');

-- --------------------------------------------------------

--
-- Structure de la table `settings`
--

CREATE TABLE `settings` (
  `id` int(10) UNSIGNED NOT NULL,
  `key` varchar(255) NOT NULL,
  `display_name` varchar(255) NOT NULL,
  `value` text DEFAULT NULL,
  `details` text DEFAULT NULL,
  `type` varchar(255) NOT NULL,
  `order` int(11) NOT NULL DEFAULT 1,
  `group` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `settings`
--

INSERT INTO `settings` (`id`, `key`, `display_name`, `value`, `details`, `type`, `order`, `group`) VALUES
(1, 'site.title', 'Site Title', 'SOBITAS', '', 'text', 1, 'Site'),
(2, 'site.description', 'Site Description', 'Site Description', '', 'text', 2, 'Site'),
(3, 'site.logo', 'Site Logo', 'settings\\May2023\\ZrMacUPUyWdZREXcYNs0.webp', '', 'image', 3, 'Site'),
(4, 'site.google_analytics_tracking_id', 'Google Analytics Tracking ID', NULL, '', 'text', 4, 'Site'),
(5, 'admin.bg_image', 'Admin Background Image', 'settings\\May2023\\4GqClRl445EU2IG6Xj1F.jpg', '', 'image', 5, 'Admin'),
(6, 'admin.title', 'Admin Title', 'SOBITAS', '', 'text', 1, 'Admin'),
(7, 'admin.description', 'Admin Description', 'Bienvenue dans l’espace administration', '', 'text', 2, 'Admin'),
(8, 'admin.loader', 'Admin Loader', 'settings\\May2023\\OWFZHYZLXLw8ezTl9801.webp', '', 'image', 3, 'Admin'),
(10, 'admin.google_analytics_client_id', 'Google Analytics Client ID (used for admin dashboard)', NULL, '', 'text', 1, 'Admin'),
(12, 'admin.icon_image', 'admin icon_image', 'settings\\May2023\\7Y9p5bB9CaD7m9py3IV5.webp', NULL, 'image', 6, 'Admin');

-- --------------------------------------------------------

--
-- Structure de la table `sous_categories`
--

CREATE TABLE `sous_categories` (
  `id` int(10) UNSIGNED NOT NULL,
  `categorie_id` int(11) DEFAULT NULL,
  `designation_fr` varchar(255) DEFAULT NULL,
  `description_fr` text DEFAULT NULL,
  `created_by` varchar(255) DEFAULT NULL,
  `updated_by` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structure de la table `tickets`
--

CREATE TABLE `tickets` (
  `id` int(10) UNSIGNED NOT NULL,
  `remise` double DEFAULT NULL,
  `prix_ht` double DEFAULT NULL,
  `prix_ttc` double DEFAULT NULL,
  `tva` double DEFAULT NULL,
  `numero` varchar(255) DEFAULT NULL,
  `created_by` varchar(255) DEFAULT NULL,
  `updated_by` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `pourcentage_remise` double DEFAULT NULL,
  `timbre` double DEFAULT NULL,
  `client_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `tickets`
--

INSERT INTO `tickets` (`id`, `remise`, `prix_ht`, `prix_ttc`, `tva`, `numero`, `created_by`, `updated_by`, `created_at`, `updated_at`, `pourcentage_remise`, `timbre`, `client_id`) VALUES
(4, 0, 50, 60.5, 9.5, '2023/0001', NULL, NULL, '2023-05-24 15:02:32', '2023-05-24 15:02:32', 0, 1, NULL),
(5, 0, 43.8, 43.8, 3.8, '2023/0002', NULL, NULL, '2023-05-24 20:45:40', '2023-06-10 14:42:12', 0, 1, NULL),
(6, 20, 251.9, 231.9, NULL, '2023/0003', NULL, NULL, '2023-06-03 22:04:17', '2023-06-03 22:04:17', 7.94, NULL, 11),
(7, 0, 140, 140, NULL, '2023/0004', NULL, NULL, '2023-06-10 14:53:39', '2023-06-10 14:53:39', 0, NULL, NULL);

-- --------------------------------------------------------

--
-- Structure de la table `translations`
--

CREATE TABLE `translations` (
  `id` int(10) UNSIGNED NOT NULL,
  `table_name` varchar(255) NOT NULL,
  `column_name` varchar(255) NOT NULL,
  `foreign_key` int(10) UNSIGNED NOT NULL,
  `locale` varchar(255) NOT NULL,
  `value` text NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `translations`
--

INSERT INTO `translations` (`id`, `table_name`, `column_name`, `foreign_key`, `locale`, `value`, `created_at`, `updated_at`) VALUES
(1, 'data_types', 'display_name_singular', 5, 'pt', 'Post', '2023-05-13 10:10:25', '2023-05-13 10:10:25'),
(2, 'data_types', 'display_name_singular', 6, 'pt', 'Página', '2023-05-13 10:10:25', '2023-05-13 10:10:25'),
(3, 'data_types', 'display_name_singular', 1, 'pt', 'Utilizador', '2023-05-13 10:10:25', '2023-05-13 10:10:25'),
(4, 'data_types', 'display_name_singular', 4, 'pt', 'Categoria', '2023-05-13 10:10:25', '2023-05-13 10:10:25'),
(5, 'data_types', 'display_name_singular', 2, 'pt', 'Menu', '2023-05-13 10:10:25', '2023-05-13 10:10:25'),
(6, 'data_types', 'display_name_singular', 3, 'pt', 'Função', '2023-05-13 10:10:25', '2023-05-13 10:10:25'),
(7, 'data_types', 'display_name_plural', 5, 'pt', 'Posts', '2023-05-13 10:10:25', '2023-05-13 10:10:25'),
(8, 'data_types', 'display_name_plural', 6, 'pt', 'Páginas', '2023-05-13 10:10:25', '2023-05-13 10:10:25'),
(9, 'data_types', 'display_name_plural', 1, 'pt', 'Utilizadores', '2023-05-13 10:10:25', '2023-05-13 10:10:25'),
(10, 'data_types', 'display_name_plural', 4, 'pt', 'Categorias', '2023-05-13 10:10:25', '2023-05-13 10:10:25'),
(11, 'data_types', 'display_name_plural', 2, 'pt', 'Menus', '2023-05-13 10:10:25', '2023-05-13 10:10:25'),
(12, 'data_types', 'display_name_plural', 3, 'pt', 'Funções', '2023-05-13 10:10:25', '2023-05-13 10:10:25'),
(13, 'categories', 'slug', 1, 'pt', 'categoria-1', '2023-05-13 10:10:25', '2023-05-13 10:10:25'),
(14, 'categories', 'name', 1, 'pt', 'Categoria 1', '2023-05-13 10:10:25', '2023-05-13 10:10:25'),
(15, 'categories', 'slug', 2, 'pt', 'categoria-2', '2023-05-13 10:10:25', '2023-05-13 10:10:25'),
(16, 'categories', 'name', 2, 'pt', 'Categoria 2', '2023-05-13 10:10:25', '2023-05-13 10:10:25'),
(17, 'pages', 'title', 1, 'pt', 'Olá Mundo', '2023-05-13 10:10:25', '2023-05-13 10:10:25'),
(18, 'pages', 'slug', 1, 'pt', 'ola-mundo', '2023-05-13 10:10:25', '2023-05-13 10:10:25'),
(19, 'pages', 'body', 1, 'pt', '<p>Olá Mundo. Scallywag grog swab Cat o\'nine tails scuttle rigging hardtack cable nipper Yellow Jack. Handsomely spirits knave lad killick landlubber or just lubber deadlights chantey pinnace crack Jennys tea cup. Provost long clothes black spot Yellow Jack bilged on her anchor league lateen sail case shot lee tackle.</p>\r\n<p>Ballast spirits fluke topmast me quarterdeck schooner landlubber or just lubber gabion belaying pin. Pinnace stern galleon starboard warp carouser to go on account dance the hempen jig jolly boat measured fer yer chains. Man-of-war fire in the hole nipperkin handsomely doubloon barkadeer Brethren of the Coast gibbet driver squiffy.</p>', '2023-05-13 10:10:25', '2023-05-13 10:10:25'),
(20, 'menu_items', 'title', 1, 'pt', 'Painel de Controle', '2023-05-13 10:10:25', '2023-05-13 10:10:25'),
(21, 'menu_items', 'title', 2, 'pt', 'Media', '2023-05-13 10:10:25', '2023-05-13 10:10:25'),
(22, 'menu_items', 'title', 12, 'pt', 'Publicações', '2023-05-13 10:10:25', '2023-05-13 10:10:25'),
(23, 'menu_items', 'title', 3, 'pt', 'Utilizadores', '2023-05-13 10:10:25', '2023-05-13 10:10:25'),
(24, 'menu_items', 'title', 11, 'pt', 'Categorias', '2023-05-13 10:10:25', '2023-05-13 10:10:25'),
(25, 'menu_items', 'title', 13, 'pt', 'Páginas', '2023-05-13 10:10:25', '2023-05-13 10:10:25'),
(26, 'menu_items', 'title', 4, 'pt', 'Funções', '2023-05-13 10:10:25', '2023-05-13 10:10:25'),
(27, 'menu_items', 'title', 5, 'pt', 'Ferramentas', '2023-05-13 10:10:25', '2023-05-13 10:10:25'),
(28, 'menu_items', 'title', 6, 'pt', 'Menus', '2023-05-13 10:10:25', '2023-05-13 10:10:25'),
(29, 'menu_items', 'title', 7, 'pt', 'Base de dados', '2023-05-13 10:10:25', '2023-05-13 10:10:25'),
(30, 'menu_items', 'title', 10, 'pt', 'Configurações', '2023-05-13 10:10:25', '2023-05-13 10:10:25');

-- --------------------------------------------------------

--
-- Structure de la table `users`
--

CREATE TABLE `users` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `role_id` bigint(20) UNSIGNED DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `avatar` varchar(255) DEFAULT 'users/default.png',
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `remember_token` varchar(100) DEFAULT NULL,
  `settings` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Déchargement des données de la table `users`
--

INSERT INTO `users` (`id`, `role_id`, `name`, `email`, `avatar`, `email_verified_at`, `password`, `remember_token`, `settings`, `created_at`, `updated_at`) VALUES
(1, 1, 'Admin', 'admin@admin.com', 'users/default.png', NULL, '$2y$10$0h63tKidV.mnYV2xRX6s6uzemGsJlkEdkKJY.ADBsc4tOLjV4g51.', 'IfuSAx6VkbWRk6BzpsrYTGV2w1dhV0xBz2gae8NH9rMfkElMN2ItaMYl4LPI', '{\"locale\":\"fr\"}', '2023-05-13 10:10:25', '2023-05-21 09:48:13'),
(2, 3, 'webmaster', 'webmaster@gmail.com', 'users\\May2023\\MrT3CJ2FwbVoWIRq2uO8.png', NULL, '$2y$10$0u5IFIdbVwORE396zDBoouJb/ncwcD8ul8Uql9irdwGxio64GY.v6', NULL, '{\"locale\":\"fr\"}', '2023-05-22 18:02:23', '2023-05-24 18:09:45');

-- --------------------------------------------------------

--
-- Structure de la table `user_roles`
--

CREATE TABLE `user_roles` (
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `role_id` bigint(20) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Index pour les tables déchargées
--

--
-- Index pour la table `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `categories_slug_unique` (`slug`),
  ADD KEY `categories_parent_id_foreign` (`parent_id`);

--
-- Index pour la table `categs`
--
ALTER TABLE `categs`
  ADD PRIMARY KEY (`id`);

--
-- Index pour la table `clients`
--
ALTER TABLE `clients`
  ADD PRIMARY KEY (`id`);

--
-- Index pour la table `commandes`
--
ALTER TABLE `commandes`
  ADD PRIMARY KEY (`id`);

--
-- Index pour la table `commande_details`
--
ALTER TABLE `commande_details`
  ADD PRIMARY KEY (`id`);

--
-- Index pour la table `coordinates`
--
ALTER TABLE `coordinates`
  ADD PRIMARY KEY (`id`);

--
-- Index pour la table `data_rows`
--
ALTER TABLE `data_rows`
  ADD PRIMARY KEY (`id`),
  ADD KEY `data_rows_data_type_id_foreign` (`data_type_id`);

--
-- Index pour la table `data_types`
--
ALTER TABLE `data_types`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `data_types_name_unique` (`name`),
  ADD UNIQUE KEY `data_types_slug_unique` (`slug`);

--
-- Index pour la table `details_factures`
--
ALTER TABLE `details_factures`
  ADD PRIMARY KEY (`id`);

--
-- Index pour la table `details_tickets`
--
ALTER TABLE `details_tickets`
  ADD PRIMARY KEY (`id`);

--
-- Index pour la table `factures`
--
ALTER TABLE `factures`
  ADD PRIMARY KEY (`id`);

--
-- Index pour la table `failed_jobs`
--
ALTER TABLE `failed_jobs`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `failed_jobs_uuid_unique` (`uuid`);

--
-- Index pour la table `menus`
--
ALTER TABLE `menus`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `menus_name_unique` (`name`);

--
-- Index pour la table `menu_items`
--
ALTER TABLE `menu_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `menu_items_menu_id_foreign` (`menu_id`);

--
-- Index pour la table `migrations`
--
ALTER TABLE `migrations`
  ADD PRIMARY KEY (`id`);

--
-- Index pour la table `pages`
--
ALTER TABLE `pages`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `pages_slug_unique` (`slug`);

--
-- Index pour la table `password_resets`
--
ALTER TABLE `password_resets`
  ADD KEY `password_resets_email_index` (`email`);

--
-- Index pour la table `permissions`
--
ALTER TABLE `permissions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `permissions_key_index` (`key`);

--
-- Index pour la table `permission_role`
--
ALTER TABLE `permission_role`
  ADD PRIMARY KEY (`permission_id`,`role_id`),
  ADD KEY `permission_role_permission_id_index` (`permission_id`),
  ADD KEY `permission_role_role_id_index` (`role_id`);

--
-- Index pour la table `personal_access_tokens`
--
ALTER TABLE `personal_access_tokens`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `personal_access_tokens_token_unique` (`token`),
  ADD KEY `personal_access_tokens_tokenable_type_tokenable_id_index` (`tokenable_type`,`tokenable_id`);

--
-- Index pour la table `posts`
--
ALTER TABLE `posts`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `posts_slug_unique` (`slug`);

--
-- Index pour la table `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`id`);

--
-- Index pour la table `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `roles_name_unique` (`name`);

--
-- Index pour la table `settings`
--
ALTER TABLE `settings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `settings_key_unique` (`key`);

--
-- Index pour la table `sous_categories`
--
ALTER TABLE `sous_categories`
  ADD PRIMARY KEY (`id`);

--
-- Index pour la table `tickets`
--
ALTER TABLE `tickets`
  ADD PRIMARY KEY (`id`);

--
-- Index pour la table `translations`
--
ALTER TABLE `translations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `translations_table_name_column_name_foreign_key_locale_unique` (`table_name`,`column_name`,`foreign_key`,`locale`);

--
-- Index pour la table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `users_email_unique` (`email`),
  ADD KEY `users_role_id_foreign` (`role_id`);

--
-- Index pour la table `user_roles`
--
ALTER TABLE `user_roles`
  ADD PRIMARY KEY (`user_id`,`role_id`),
  ADD KEY `user_roles_user_id_index` (`user_id`),
  ADD KEY `user_roles_role_id_index` (`role_id`);

--
-- AUTO_INCREMENT pour les tables déchargées
--

--
-- AUTO_INCREMENT pour la table `categories`
--
ALTER TABLE `categories`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT pour la table `categs`
--
ALTER TABLE `categs`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `clients`
--
ALTER TABLE `clients`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT pour la table `commandes`
--
ALTER TABLE `commandes`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `commande_details`
--
ALTER TABLE `commande_details`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `coordinates`
--
ALTER TABLE `coordinates`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT pour la table `data_rows`
--
ALTER TABLE `data_rows`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=205;

--
-- AUTO_INCREMENT pour la table `data_types`
--
ALTER TABLE `data_types`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT pour la table `details_factures`
--
ALTER TABLE `details_factures`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=60;

--
-- AUTO_INCREMENT pour la table `details_tickets`
--
ALTER TABLE `details_tickets`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT pour la table `factures`
--
ALTER TABLE `factures`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=29;

--
-- AUTO_INCREMENT pour la table `failed_jobs`
--
ALTER TABLE `failed_jobs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `menus`
--
ALTER TABLE `menus`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT pour la table `menu_items`
--
ALTER TABLE `menu_items`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=28;

--
-- AUTO_INCREMENT pour la table `migrations`
--
ALTER TABLE `migrations`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=29;

--
-- AUTO_INCREMENT pour la table `pages`
--
ALTER TABLE `pages`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT pour la table `permissions`
--
ALTER TABLE `permissions`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=96;

--
-- AUTO_INCREMENT pour la table `personal_access_tokens`
--
ALTER TABLE `personal_access_tokens`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `posts`
--
ALTER TABLE `posts`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT pour la table `products`
--
ALTER TABLE `products`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT pour la table `roles`
--
ALTER TABLE `roles`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT pour la table `settings`
--
ALTER TABLE `settings`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT pour la table `sous_categories`
--
ALTER TABLE `sous_categories`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `tickets`
--
ALTER TABLE `tickets`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT pour la table `translations`
--
ALTER TABLE `translations`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=31;

--
-- AUTO_INCREMENT pour la table `users`
--
ALTER TABLE `users`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- Contraintes pour les tables déchargées
--

--
-- Contraintes pour la table `categories`
--
ALTER TABLE `categories`
  ADD CONSTRAINT `categories_parent_id_foreign` FOREIGN KEY (`parent_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Contraintes pour la table `data_rows`
--
ALTER TABLE `data_rows`
  ADD CONSTRAINT `data_rows_data_type_id_foreign` FOREIGN KEY (`data_type_id`) REFERENCES `data_types` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Contraintes pour la table `menu_items`
--
ALTER TABLE `menu_items`
  ADD CONSTRAINT `menu_items_menu_id_foreign` FOREIGN KEY (`menu_id`) REFERENCES `menus` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `permission_role`
--
ALTER TABLE `permission_role`
  ADD CONSTRAINT `permission_role_permission_id_foreign` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `permission_role_role_id_foreign` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `users_role_id_foreign` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`);

--
-- Contraintes pour la table `user_roles`
--
ALTER TABLE `user_roles`
  ADD CONSTRAINT `user_roles_role_id_foreign` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `user_roles_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
