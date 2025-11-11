-- MySQL dump 10.13  Distrib 8.4.7, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: attendance_db
-- ------------------------------------------------------
-- Server version	8.4.7

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `attendances`
--

DROP TABLE IF EXISTS `attendances`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `attendances` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `status` enum('present','late','absent') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'present',
  `date` date NOT NULL,
  `checkIn` time DEFAULT NULL,
  `checkOut` time DEFAULT NULL,
  `hours` decimal(4,2) DEFAULT '0.00',
  `notes` text COLLATE utf8mb4_general_ci,
  `meta` json DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `attendances_user_id_date` (`user_id`,`date`),
  KEY `attendances_user_id` (`user_id`),
  KEY `attendances_date` (`date`),
  KEY `attendances_status` (`status`),
  CONSTRAINT `attendances_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `attendances_ibfk_10` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `attendances_ibfk_11` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `attendances_ibfk_12` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `attendances_ibfk_13` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `attendances_ibfk_14` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `attendances_ibfk_15` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `attendances_ibfk_16` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `attendances_ibfk_17` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `attendances_ibfk_18` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `attendances_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `attendances_ibfk_3` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `attendances_ibfk_4` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `attendances_ibfk_5` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `attendances_ibfk_6` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `attendances_ibfk_7` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `attendances_ibfk_8` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE,
  CONSTRAINT `attendances_ibfk_9` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `attendances`
--

LOCK TABLES `attendances` WRITE;
/*!40000 ALTER TABLE `attendances` DISABLE KEYS */;
/*!40000 ALTER TABLE `attendances` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `settings`
--

DROP TABLE IF EXISTS `settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `settings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `emailNotifications` tinyint(1) NOT NULL DEFAULT '1',
  `smsNotifications` tinyint(1) NOT NULL DEFAULT '0',
  `pushNotifications` tinyint(1) NOT NULL DEFAULT '1',
  `dailyReports` tinyint(1) NOT NULL DEFAULT '1',
  `dailyReportTime` varchar(5) COLLATE utf8mb4_general_ci NOT NULL DEFAULT '18:00',
  `standardCheckIn` varchar(5) COLLATE utf8mb4_general_ci NOT NULL DEFAULT '09:00',
  `standardCheckOut` varchar(5) COLLATE utf8mb4_general_ci NOT NULL DEFAULT '17:00',
  `lateArrivalThreshold` int NOT NULL DEFAULT '15',
  `minimumWorkingHours` decimal(4,2) NOT NULL DEFAULT '4.50',
  `smtpHost` varchar(255) COLLATE utf8mb4_general_ci DEFAULT 'smtp.gmail.com',
  `smtpPort` int DEFAULT '587',
  `smtpSecure` tinyint(1) NOT NULL DEFAULT '0',
  `fromEmail` varchar(255) COLLATE utf8mb4_general_ci DEFAULT 'noreply@attendance.com',
  `smtpUsername` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `smtpPassword` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `sessionTimeout` int NOT NULL DEFAULT '60',
  `twoFactorAuth` tinyint(1) NOT NULL DEFAULT '0',
  `maxLoginAttempts` int NOT NULL DEFAULT '5',
  `lockoutDuration` int NOT NULL DEFAULT '30',
  `passwordMinLength` int NOT NULL DEFAULT '8',
  `automaticBackups` tinyint(1) NOT NULL DEFAULT '1',
  `backupFrequency` enum('daily','weekly','monthly') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'daily',
  `backupTime` varchar(5) COLLATE utf8mb4_general_ci NOT NULL DEFAULT '02:00',
  `backupRetentionDays` int NOT NULL DEFAULT '30',
  `lastBackupDate` datetime DEFAULT NULL,
  `smsProvider` varchar(50) COLLATE utf8mb4_general_ci DEFAULT 'twilio',
  `twilioAccountSid` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `twilioAuthToken` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `twilioPhoneNumber` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `fcmServerKey` text COLLATE utf8mb4_general_ci,
  `fcmProjectId` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `systemName` varchar(255) COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'Attendance Management System',
  `systemEmail` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `systemPhone` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `timezone` varchar(100) COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'Asia/Kolkata',
  `dateFormat` varchar(50) COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'DD/MM/YYYY',
  `timeFormat` varchar(20) COLLATE utf8mb4_general_ci NOT NULL DEFAULT '24h',
  `updatedBy` int DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `updatedBy` (`updatedBy`),
  CONSTRAINT `settings_ibfk_1` FOREIGN KEY (`updatedBy`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `settings`
--

LOCK TABLES `settings` WRITE;
/*!40000 ALTER TABLE `settings` DISABLE KEYS */;
INSERT INTO `settings` VALUES (1,1,0,1,1,'18:00','09:00','17:00',15,4.50,'smtp.gmail.com',587,0,'noreply@attendance.com',NULL,NULL,60,0,5,30,8,1,'daily','02:00',30,NULL,'twilio',NULL,NULL,NULL,NULL,NULL,'Attendance Management System',NULL,NULL,'Asia/Kolkata','DD/MM/YYYY','24h',13,'2025-11-09 19:47:36','2025-11-09 19:47:36');
/*!40000 ALTER TABLE `settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `fullName` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `role` enum('admin','teacher','student') COLLATE utf8mb4_general_ci NOT NULL,
  `uid` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `dept` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `photo` varchar(1024) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `phone` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `address` text COLLATE utf8mb4_general_ci,
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `isVerified` tinyint(1) NOT NULL DEFAULT '0',
  `resetPasswordToken` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `resetPasswordExpires` datetime DEFAULT NULL,
  `failedLoginAttempts` int NOT NULL DEFAULT '0',
  `accountLockedUntil` datetime DEFAULT NULL,
  `lastLogin` datetime DEFAULT NULL,
  `createdBy` int DEFAULT NULL,
  `createdAt` datetime NOT NULL,
  `updatedAt` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `email_2` (`email`),
  UNIQUE KEY `email_3` (`email`),
  UNIQUE KEY `email_4` (`email`),
  UNIQUE KEY `email_5` (`email`),
  UNIQUE KEY `email_6` (`email`),
  UNIQUE KEY `email_7` (`email`),
  UNIQUE KEY `email_8` (`email`),
  UNIQUE KEY `email_9` (`email`),
  UNIQUE KEY `email_10` (`email`),
  UNIQUE KEY `email_11` (`email`),
  UNIQUE KEY `email_12` (`email`),
  UNIQUE KEY `email_13` (`email`),
  UNIQUE KEY `email_14` (`email`),
  UNIQUE KEY `email_15` (`email`),
  UNIQUE KEY `email_16` (`email`),
  UNIQUE KEY `email_17` (`email`),
  UNIQUE KEY `email_18` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (13,'Admin User','admin@example.com','$2a$10$ylnln7O.7HIpyniok2v1GuHpZdRAUUBL30gNKnbjgukm/EEF.90Be','admin','ADM-001',NULL,NULL,NULL,NULL,1,1,NULL,NULL,0,NULL,'2025-11-09 18:12:39',NULL,'2025-11-09 18:12:25','2025-11-09 18:12:39'),(14,'Teacher User','teacher@example.com','$2a$10$4NbOJZQp1GFvHVxwLdI2ReSmV3zAYqBHhgW3r960HBeO85N6R4UxW','teacher','TCH-001',NULL,NULL,NULL,NULL,1,1,NULL,NULL,0,NULL,NULL,NULL,'2025-11-09 18:12:25','2025-11-09 18:12:25'),(15,'Student User','student@example.com','$2a$10$zQkCywbKfZFRL70tU./44OTKfvKTIBh5so..NqU.oOiclTdFiB.6O','student','STU-001',NULL,NULL,NULL,NULL,1,1,NULL,NULL,0,NULL,NULL,NULL,'2025-11-09 18:12:25','2025-11-09 18:12:25'),(17,'rahul','ptg40884@gmail.com','$2a$10$0/oSs2r/BmoKmqmqrFwAMOM0CZWkdP/ftDQQMuVQQtIOz4TBPG5GC','student','ptg40884@gmail.com','13th',NULL,NULL,NULL,1,0,NULL,NULL,0,NULL,NULL,NULL,'2025-11-09 18:26:06','2025-11-09 18:26:06'),(18,'rahull','ptg40884@gmail.lcom','$2a$10$RIzwS2oclNIDzS8lt8/bMOCRxNh.2Q1NPXJuZKm7auLaEFxon2K36','student','ptg40884@gmail.com','13th',NULL,'','',1,0,NULL,NULL,0,NULL,NULL,NULL,'2025-11-09 18:59:17','2025-11-09 19:47:23');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-11-10  2:00:00
