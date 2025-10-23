-- MySQL dump 10.13  Distrib 8.0.43, for Win64 (x86_64)
--
-- Host: localhost    Database: radio1rph
-- ------------------------------------------------------
-- Server version	8.0.43

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `admins`
--

DROP TABLE IF EXISTS `admins`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `admins` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('admin','superadmin') COLLATE utf8mb4_unicode_ci DEFAULT 'admin',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `admins`
--

LOCK TABLES `admins` WRITE;
/*!40000 ALTER TABLE `admins` DISABLE KEYS */;
INSERT INTO `admins` VALUES (2,'manoj ','cmascarenhas103@gmail.com','scrypt:32768:8:1$0tvtoeEh7WM6WV0L$ac4df67739c429868810ae46e961a2f9c5c2ea39f7ff98d1f9e641719e6cfb2dd3b6fe75255f9413f3d1fa259124273057738f73a60f0e678c3f8e951602d26d','admin','2025-09-13 22:57:37'),(3,'carlos','cmascarenhas106@gmail.com','scrypt:32768:8:1$5rjBmNb0IWsZxJlH$400840e0239ad8c4b510026443209a7bf034222fb99e89ef1266bbff48e5634c32db05ec5abcfbd4ebf50ad68d7bbc9782e8f33397759e900bf2f3b8fcd91f6b','admin','2025-09-22 17:48:15'),(4,'Alan ','cmascarenhas108@gmail.com','scrypt:32768:8:1$GGPkGir8ICRKjORG$f52da60207bba62b26b80a4b091254246c750379f367adc5f1ee7d26cea6f09f0709d89d3434f61cbc5f95edcb97ddfd6b1f2113fb67cfb096b31cb77dc50064','admin','2025-09-28 17:44:21');
/*!40000 ALTER TABLE `admins` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `attendance`
--

DROP TABLE IF EXISTS `attendance`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `attendance` (
  `id` int NOT NULL AUTO_INCREMENT,
  `volunteer_id` int NOT NULL,
  `clock_in` datetime DEFAULT NULL,
  `clock_out` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `volunteer_id` (`volunteer_id`),
  CONSTRAINT `attendance_ibfk_1` FOREIGN KEY (`volunteer_id`) REFERENCES `volunteers` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=43 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `attendance`
--

LOCK TABLES `attendance` WRITE;
/*!40000 ALTER TABLE `attendance` DISABLE KEYS */;
INSERT INTO `attendance` VALUES (40,2,'2025-09-30 07:35:38','2025-09-30 07:40:28'),(41,2,'2025-09-30 08:55:15','2025-09-30 09:00:37'),(42,2,'2025-09-30 09:10:11','2025-09-30 09:46:56');
/*!40000 ALTER TABLE `attendance` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `eois`
--

DROP TABLE IF EXISTS `eois`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `eois` (
  `id` int NOT NULL AUTO_INCREMENT,
  `volunteer_id` int NOT NULL,
  `training_id` int NOT NULL,
  `submitted_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `status` enum('pending','approved','rejected','cancelled','standby') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_eoi` (`volunteer_id`,`training_id`),
  KEY `training_id` (`training_id`),
  CONSTRAINT `eois_ibfk_1` FOREIGN KEY (`volunteer_id`) REFERENCES `volunteers` (`id`),
  CONSTRAINT `eois_ibfk_2` FOREIGN KEY (`training_id`) REFERENCES `trainings` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `eois`
--

LOCK TABLES `eois` WRITE;
/*!40000 ALTER TABLE `eois` DISABLE KEYS */;
INSERT INTO `eois` VALUES (1,2,1,'2025-09-18 10:41:34','rejected'),(2,3,1,'2025-09-18 10:42:00','rejected'),(3,2,2,'2025-09-18 11:12:47','approved'),(4,3,2,'2025-09-21 09:24:38','approved'),(5,5,1,'2025-09-22 10:27:17','approved'),(6,5,2,'2025-09-22 11:04:59','cancelled'),(11,6,1,'2025-09-22 18:26:18','rejected'),(12,6,2,'2025-09-22 18:26:20','approved'),(13,2,3,'2025-09-23 08:44:06','approved');
/*!40000 ALTER TABLE `eois` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notifications` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `audience` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL,
  `volunteer_id` int DEFAULT NULL,
  `type` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `body` text COLLATE utf8mb4_unicode_ci,
  `meta` json DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `read_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notifications`
--

LOCK TABLES `notifications` WRITE;
/*!40000 ALTER TABLE `notifications` DISABLE KEYS */;
INSERT INTO `notifications` VALUES (2,'admin',NULL,'qualification_expired_admin','Raj  qualification expired','Qualification (ID 2) for Raj  expired today.','{\"expiry_date\": \"2025-09-24\", \"training_id\": 1, \"volunteer_id\": 1, \"qualification_id\": 2}','2025-09-23 05:45:13',NULL),(3,'volunteer',2,'training_result_competent','Result recorded: Competent — WWVP training ','Congratulations Carlos , you have been recorded as Competent for WWVP training .\nCertificate: /uploads/qualifications/fbc0bcecc8524c3884754ae9b4fe76e2_barplot_image.png','{\"result\": \"competent\", \"result_id\": 1, \"training_id\": 2, \"evidence_path\": \"/uploads/qualifications/9c01f835e3f3405eb6982f941c0127ef_Bunnings_Center_Products_.png\", \"certificate_path\": \"/uploads/qualifications/fbc0bcecc8524c3884754ae9b4fe76e2_barplot_image.png\", \"next_opportunity\": null}','2025-09-28 20:32:11','2025-09-28 21:48:18'),(4,'volunteer',3,'training_result_nyc','Result recorded: Not Yet Competent — WWVP training ','kirk, your result for WWVP training  is Not Yet Competent. Next opportunity expected on 2025-10-22.','{\"result\": \"not_yet_competent\", \"result_id\": 2, \"training_id\": 2, \"evidence_path\": null, \"certificate_path\": null, \"next_opportunity\": \"2025-10-22\"}','2025-09-29 01:42:04',NULL),(5,'volunteer',3,'training_result_competent','Result recorded: Competent — WWVP training ','Congratulations kirk, you have been recorded as Competent for WWVP training .\nCertificate: /uploads/qualifications/17824b0ffef04f6782b9ac358bc2e5c0_barplot_image.png','{\"result\": \"competent\", \"result_id\": 2, \"training_id\": 2, \"evidence_path\": \"/uploads/qualifications/d23ad1128edb460c982dc8930f70b816_Bunnings_Center_Products_.png\", \"certificate_path\": \"/uploads/qualifications/17824b0ffef04f6782b9ac358bc2e5c0_barplot_image.png\", \"next_opportunity\": \"2025-10-22\"}','2025-10-01 02:45:34',NULL);
/*!40000 ALTER TABLE `notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `password_reset_tokens`
--

DROP TABLE IF EXISTS `password_reset_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `password_reset_tokens` (
  `id` int NOT NULL AUTO_INCREMENT,
  `admin_id` int NOT NULL,
  `token` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expires_at` datetime NOT NULL,
  `used_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token` (`token`),
  KEY `admin_id` (`admin_id`),
  CONSTRAINT `password_reset_tokens_ibfk_1` FOREIGN KEY (`admin_id`) REFERENCES `admins` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `password_reset_tokens`
--

LOCK TABLES `password_reset_tokens` WRITE;
/*!40000 ALTER TABLE `password_reset_tokens` DISABLE KEYS */;
INSERT INTO `password_reset_tokens` VALUES (1,2,'CVA3EKxKZcinpkvQnT-SwixbAQUyI0n9BLiES4Dh_3g','2025-09-29 10:41:22',NULL,'2025-09-29 09:41:22'),(2,2,'mbYDrHjl9Oj3O8_9y6VBBWGjTwbhFNdCUAU8WMSKeV0','2025-09-29 11:10:04','2025-09-29 10:11:11','2025-09-29 10:10:04'),(3,2,'pMIU1yeTZrFLGn-IYrZTKDI-1wdIYWmMD8kgWoaMdSQ','2025-09-30 07:31:25','2025-09-30 06:32:21','2025-09-30 06:31:25');
/*!40000 ALTER TABLE `password_reset_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `qualifications`
--

DROP TABLE IF EXISTS `qualifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `qualifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `volunteer_id` int NOT NULL,
  `training_id` int NOT NULL,
  `issue_date` date DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `document_path` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `volunteer_id` (`volunteer_id`),
  KEY `training_id` (`training_id`),
  CONSTRAINT `qualifications_ibfk_1` FOREIGN KEY (`volunteer_id`) REFERENCES `volunteers` (`id`),
  CONSTRAINT `qualifications_ibfk_2` FOREIGN KEY (`training_id`) REFERENCES `trainings` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `qualifications`
--

LOCK TABLES `qualifications` WRITE;
/*!40000 ALTER TABLE `qualifications` DISABLE KEYS */;
INSERT INTO `qualifications` VALUES (3,2,1,'2025-09-23','2025-09-23','/uploads/qualifications/bd32128007f2433d9c4c81cf2eeae151_barplot_image.png'),(4,2,2,'2025-09-17','2025-09-18','/uploads/qualifications/37b2c2ead84d4a3aa9ba9d4987c714f7_Bunnings_Center_Products_.png'),(6,2,3,'2025-09-30','2025-10-31','/uploads/qualifications/d016c49253fd455ab5a5abd49381d5d6_barplot_image.png'),(7,2,1,'2025-09-03','2025-09-30','/uploads/qualifications/4f9a73dcbabe4030a850f12ff06332c5_barplot_image.png');
/*!40000 ALTER TABLE `qualifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `training_results`
--

DROP TABLE IF EXISTS `training_results`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `training_results` (
  `id` int NOT NULL AUTO_INCREMENT,
  `volunteer_id` int NOT NULL,
  `training_id` int NOT NULL,
  `result` enum('competent','not_yet_competent','not_assessed','participated') COLLATE utf8mb4_unicode_ci NOT NULL,
  `issued_by` enum('inhouse','external') COLLATE utf8mb4_unicode_ci NOT NULL,
  `assessor_name` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `date_assessed` date DEFAULT NULL,
  `certificate_path` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `evidence_path` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `next_opportunity` date DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_volunteer_training_result` (`volunteer_id`,`training_id`),
  KEY `training_id` (`training_id`),
  CONSTRAINT `training_results_ibfk_1` FOREIGN KEY (`volunteer_id`) REFERENCES `volunteers` (`id`),
  CONSTRAINT `training_results_ibfk_2` FOREIGN KEY (`training_id`) REFERENCES `trainings` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `training_results`
--

LOCK TABLES `training_results` WRITE;
/*!40000 ALTER TABLE `training_results` DISABLE KEYS */;
INSERT INTO `training_results` VALUES (1,2,2,'competent','inhouse','Alan','2025-09-29','/uploads/qualifications/6ca674f13d374d39a5efb357f801453e_barplot_image.png','/uploads/qualifications/74f83d9d3bcb471294111b54039647c8_barplot_image.png','Congragulations on achieving a milestone we are proud of you.',NULL,'2025-09-29 06:32:10'),(2,3,2,'competent','inhouse','Alan ','2025-09-29','/uploads/qualifications/17824b0ffef04f6782b9ac358bc2e5c0_barplot_image.png','/uploads/qualifications/d23ad1128edb460c982dc8930f70b816_Bunnings_Center_Products_.png','Congragulations on completing the training and the assessment successfully','2025-10-22','2025-09-29 11:42:04');
/*!40000 ALTER TABLE `training_results` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `trainings`
--

DROP TABLE IF EXISTS `trainings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `trainings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `type` enum('internal','external') COLLATE utf8mb4_unicode_ci DEFAULT 'internal',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `provider` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `trainer_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `accreditation` enum('external_accredited','external_non_accredited','in_house') COLLATE utf8mb4_unicode_ci DEFAULT 'in_house',
  `delivery_mode` enum('online','in_person','hybrid') COLLATE utf8mb4_unicode_ci DEFAULT 'in_person',
  `venue` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cost` decimal(10,2) DEFAULT NULL,
  `prerequisites` text COLLATE utf8mb4_unicode_ci,
  `capacity` int DEFAULT NULL,
  `eoi_close_date` date DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `trainings`
--

LOCK TABLES `trainings` WRITE;
/*!40000 ALTER TABLE `trainings` DISABLE KEYS */;
INSERT INTO `trainings` VALUES (1,'First Aid and CPR','Handling First-Aid with Ease ','2025-09-19','2025-09-19','internal','2025-09-17 23:24:59','Radio1RPH Trainer ','Alan ','in_house','hybrid','Canberra ',NULL,'NA',NULL,'2025-09-30'),(2,'WWVP training ','handling aged ','2025-09-19','2025-09-30','internal','2025-09-18 01:12:26',NULL,NULL,'in_house','in_person',NULL,NULL,NULL,NULL,NULL),(3,'Mental Wellbeing Training ','Train in order to be mentally positive ','2025-09-23','2025-09-30','internal','2025-09-22 22:43:19','Radio1RPH Trainer ','Carlos ','in_house','hybrid','Canberra ',NULL,'None ',NULL,'2025-09-24');
/*!40000 ALTER TABLE `trainings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vol_password_reset_tokens`
--

DROP TABLE IF EXISTS `vol_password_reset_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vol_password_reset_tokens` (
  `id` int NOT NULL AUTO_INCREMENT,
  `volunteer_id` int NOT NULL,
  `token` varchar(128) NOT NULL,
  `expires_at` datetime NOT NULL,
  `used_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_vol_reset_token` (`token`),
  KEY `fk_vol_reset_volunteer` (`volunteer_id`),
  CONSTRAINT `fk_vol_reset_volunteer` FOREIGN KEY (`volunteer_id`) REFERENCES `volunteers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vol_password_reset_tokens`
--

LOCK TABLES `vol_password_reset_tokens` WRITE;
/*!40000 ALTER TABLE `vol_password_reset_tokens` DISABLE KEYS */;
INSERT INTO `vol_password_reset_tokens` VALUES (1,2,'WMXSTcS-RogAzcToxF5EczXffEswDuSP46WkRe7J53s','2025-09-29 12:15:30',NULL,'2025-09-29 11:15:30');
/*!40000 ALTER TABLE `vol_password_reset_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `volunteers`
--

DROP TABLE IF EXISTS `volunteers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `volunteers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `training_goals` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `emergency_contact` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `volunteers`
--

LOCK TABLES `volunteers` WRITE;
/*!40000 ALTER TABLE `volunteers` DISABLE KEYS */;
INSERT INTO `volunteers` VALUES (2,'carlos desmond mascarenhas','kirkdmello25@gmail.com','pbkdf2:sha256:1000000$RDvNbJkek9TY21KC$be21ea76d1d103bb3e0b54819b87d83b3f296ea9c47e5713416d1acfef3ce443','09004868447','active','First aid training student still learning','2025-09-17 16:06:33','Kirk '),(3,'kirk','cmascarenhas102@gmail.com','scrypt:32768:8:1$Th7It62Drrrvznfq$ce7e31a65583582b6a4cd33dd57860bdf44e049c0af8ff694daf9b9b5c44259162cefb7cc17ed9fa9e0341856feab2c583c5da239c744a8dcec6ad03809a5800','0468339177','active',NULL,'2025-09-17 20:58:43',NULL),(5,'Natalia ','cmascarenhas104@gmail.com','scrypt:32768:8:1$7j0XSqIKyxdOPwtS$cf2110fe6ee5006be8c87c1a0b2f2de95cb94f4fce2dfb273e79848a925f176161b520c6e87419cd6f478fef3ba51a58ec6a4f2738f0485ecfa61e05a61e66e0','0468339177','active',NULL,'2025-09-21 01:15:34',NULL),(6,'Manoj ','cmascarenhas105@gmail.com','scrypt:32768:8:1$rxeIGyY6Dq7yHvbf$518b81fd3097eac7ecb9f2a2a6d11bcf316feee6718df43515cc1f360a326ad64accd0f2e7dda1e53b419bbb2f4b69ffdc1fec815d10101042dcacc00240e276','068339177','active',NULL,'2025-09-22 08:25:49',NULL),(7,'Shanti','cmascarenhas110@gmail.com','scrypt:32768:8:1$E0LXzyK7S0DdbK0K$be058220817d69331e05c58e2ec471214b3d5fb8846012f37eecb2fb3f25dd3d51c8d5102eef49bf4cde0b2ea6e0dc968d762dc249c6e2e5cb385611ce50586a','0468339177','active','Optimise first aid techniques','2025-09-28 22:14:31',NULL),(8,'Desmond Mascarenhas','cmascarenhas111@gmail.com','scrypt:32768:8:1$l8XdLNvvxQel15xy$dc80745adad60d21327cf311af6d96c261da8397f97e31845b36beb49de888aa47850b7db3f41b443ac716c3e941bc724c08426b61b61bdc29b44b74d861e4ce','0468339188','active','Obtain first aid and wwvp qualifications','2025-09-28 22:22:00',NULL);
/*!40000 ALTER TABLE `volunteers` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-10-02 10:58:47
