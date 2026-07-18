-- MySQL dump 10.13  Distrib 8.0.46, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: footmanager
-- ------------------------------------------------------
-- Server version	8.0.46

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
-- Table structure for table `allenatore`
--

DROP TABLE IF EXISTS `allenatore`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `allenatore` (
  `id_allenatore` int NOT NULL AUTO_INCREMENT,
  `nome` varchar(50) NOT NULL,
  `cognome` varchar(50) NOT NULL,
  `id_squadra` int DEFAULT NULL,
  `id_user` int DEFAULT NULL,
  PRIMARY KEY (`id_allenatore`),
  KEY `id_squadra` (`id_squadra`),
  KEY `id_user` (`id_user`),
  CONSTRAINT `allenatore_ibfk_1` FOREIGN KEY (`id_squadra`) REFERENCES `squadra` (`id_squadra`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `allenatore_ibfk_2` FOREIGN KEY (`id_user`) REFERENCES `utente` (`id_user`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `allenatore`
--

LOCK TABLES `allenatore` WRITE;
/*!40000 ALTER TABLE `allenatore` DISABLE KEYS */;
INSERT INTO `allenatore` VALUES (1,'Luciano','Spalletti',1,2);
/*!40000 ALTER TABLE `allenatore` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `badge`
--

DROP TABLE IF EXISTS `badge`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `badge` (
  `id_badge` int NOT NULL AUTO_INCREMENT,
  `nome_badge` varchar(100) NOT NULL,
  `soglia_punti` int DEFAULT '0',
  `icona` blob,
  PRIMARY KEY (`id_badge`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `badge`
--

LOCK TABLES `badge` WRITE;
/*!40000 ALTER TABLE `badge` DISABLE KEYS */;
/*!40000 ALTER TABLE `badge` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `calendario`
--

DROP TABLE IF EXISTS `calendario`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `calendario` (
  `id_calendar` int NOT NULL AUTO_INCREMENT,
  PRIMARY KEY (`id_calendar`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `calendario`
--

LOCK TABLES `calendario` WRITE;
/*!40000 ALTER TABLE `calendario` DISABLE KEYS */;
INSERT INTO `calendario` VALUES (1);
/*!40000 ALTER TABLE `calendario` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `evento`
--

DROP TABLE IF EXISTS `evento`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `evento` (
  `id_evento` int NOT NULL AUTO_INCREMENT,
  `titolo` varchar(150) NOT NULL,
  `data_ora_inizio` datetime NOT NULL,
  `data_ora_fine` datetime NOT NULL,
  `tipo` enum('ALLENAMENTO','ALTRO','PARTITA','RIUNIONE') NOT NULL,
  `luogo` varchar(200) DEFAULT NULL,
  `id_calendar` int DEFAULT NULL,
  PRIMARY KEY (`id_evento`),
  KEY `id_calendar` (`id_calendar`),
  CONSTRAINT `evento_ibfk_1` FOREIGN KEY (`id_calendar`) REFERENCES `calendario` (`id_calendar`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `evento`
--

LOCK TABLES `evento` WRITE;
/*!40000 ALTER TABLE `evento` DISABLE KEYS */;
INSERT INTO `evento` VALUES (1,'Allenamento tattico','2026-07-20 17:30:00','2026-07-20 19:30:00','ALLENAMENTO','Centro Sportivo Juventus',1),(2,'Riunione con lo staff','2026-07-21 10:00:00','2026-07-21 11:30:00','RIUNIONE','Sala Conferenze',1),(3,'Juvenut vs Torino FC','2026-07-23 20:45:00','2026-07-23 22:45:00','PARTITA','Allianz Stadium',1),(4,'Cena di squadra','2026-07-25 20:00:00','2026-07-25 22:30:00','ALTRO','Ristorante La Pergola',1);
/*!40000 ALTER TABLE `evento` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `giocatore`
--

DROP TABLE IF EXISTS `giocatore`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `giocatore` (
  `id_giocatore` int NOT NULL AUTO_INCREMENT,
  `nome` varchar(50) NOT NULL,
  `cognome` varchar(50) NOT NULL,
  `numero` int DEFAULT NULL,
  `img` varchar(255) DEFAULT NULL,
  `piede` varchar(10) DEFAULT NULL,
  `posizione` varchar(50) DEFAULT NULL,
  `altezza` int DEFAULT NULL,
  `id_squadra` int DEFAULT NULL,
  `id_user` int NOT NULL,
  `data_nascita` date DEFAULT NULL,
  `nazionalita` varchar(50) DEFAULT NULL,
  `punti_settimanali` int NOT NULL,
  `punti_totali` int NOT NULL,
  `peso` int DEFAULT NULL,
  PRIMARY KEY (`id_giocatore`),
  UNIQUE KEY `id_user_UNIQUE` (`id_user`),
  KEY `id_squadra` (`id_squadra`),
  CONSTRAINT `giocatore_ibfk_1` FOREIGN KEY (`id_squadra`) REFERENCES `squadra` (`id_squadra`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `giocatore`
--

LOCK TABLES `giocatore` WRITE;
/*!40000 ALTER TABLE `giocatore` DISABLE KEYS */;
INSERT INTO `giocatore` VALUES (1,'Michele','Di Gregorio',29,'uploads/di_gregorio.png','Destro','Portiere',187,1,3,'1997-07-27','Italia',1,1,82),(2,'Mattia','Perin',1,'uploads/perin.png','Destro','Portiere',188,1,4,'1992-11-10','Italia',1,1,77),(3,'Carlo','Pinsoglio',23,'uploads/pinsoglio.png','Destro','Portiere',194,1,5,'1990-03-16','Italia',1,1,82),(4,'Federico','Gatti',4,'uploads/gatti.png','Destro','Difensore',190,1,6,'1998-06-24','Italia',1,1,84),(5,'Gleison','Bremer',3,'uploads/bremer.png','Destro','Difensore',188,1,7,'1997-03-18','Brasile',1,1,80),(6,'Juan','Cabal',32,'uploads/cabal.png','Sinistro','Difensore',186,1,8,'2001-01-08','Colombia',1,1,78),(7,'Pierre','Kalulu',15,'uploads/kalulu.png','Destro','Difensore',184,1,9,'2000-06-05','Francia',1,1,70),(8,'Lloyd','Kelly',6,'uploads/kelly.png','Sinistro','Difensore',190,1,10,'1998-10-06','Inghilterra',1,1,77),(9,'Daniele','Rugani',24,'uploads/rugani.png','Destro','Difensore',190,1,11,'1994-07-29','Italia',1,1,84),(10,'Andrea','Cambiaso',27,'uploads/cambiaso.png','Destro','Difensore',181,1,12,'2000-02-20','Italia',1,1,75),(11,'Manuel','Locatelli',5,'luploads/ocatelli.png','Destro','Centrocampista',186,1,13,'1998-01-08','Italia',1,1,75),(12,'Khephren','Thuram',19,'uploads/thuram.png','Destro','Centrocampista',192,1,14,'2001-03-26','Francia',1,1,90),(13,'Teun','Koopmeiners',8,'uploads/koopmeiners.png','Sinistro','Centrocampista',184,1,15,'1998-02-28','Paesi Bassi',1,1,77),(14,'Weston','McKennie',16,'uploads/mckennie.png','Destro','Centrocampista',185,1,16,'1998-08-28','Stati Uniti',1,1,84),(15,'Douglas','Luiz',26,'uploads/douglasluiz.png','Destro','Centrocampista',175,1,17,'1998-05-09','Brasile',1,1,66),(16,'Fabio','Miretti',21,'uploads/miretti.png','Destro','Centrocampista',180,1,18,'2003-08-03','Italia',1,1,72),(17,'Vasilije','Adzic',17,'uploads/adzic.png','Destro','Centrocampista',186,1,19,'2006-05-12','Montenegro',1,1,76),(18,'Kenan','Yildiz',10,'uploads/yildiz.png','Destro','Attaccante',185,1,20,'2005-05-04','Turchia',1,1,78),(19,'Francisco','Conceicao',7,'uploads/conceicao.png','Sinistro','Attaccante',170,1,21,'2002-12-14','Portogallo',1,1,70),(20,'Nicolas','Gonzalez',11,'uploads/gonzalez.png','Sinistro','Attaccante',180,1,22,'1998-04-06','Argentina',1,1,81),(21,'Arkadiusz','Milik',14,'uploads/milik.png','Sinistro','Attaccante',186,1,23,'1994-02-28','Polonia',1,1,78),(22,'Lois','Openda',20,'uploads/openda.png','Destro','Attaccante',177,1,24,'2000-02-16','Belgio',1,1,75),(23,'Jeremie','Boga',18,'uploads/boga.png','Destro','Attaccante',174,1,25,'1997-01-03','Costa d’Avorio',1,1,72),(24,'Edon','Zhegrova',22,'uploads/zhegrova.png','Sinistro','Attaccante',181,1,26,'1999-03-31','Kosovo',1,1,66),(25,'Jonathan','David',9,'uploads/david.png','Destro','Attaccante',175,1,27,'2000-01-14','Canada',1,1,70),(26,'Jeff','Ekhator',21,'uploads/ekhator.png','Destro','Attaccante',188,1,28,'2006-11-11','Italia',1,1,80);
/*!40000 ALTER TABLE `giocatore` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `giocatore_badge`
--

DROP TABLE IF EXISTS `giocatore_badge`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `giocatore_badge` (
  `id_giocatore` int NOT NULL,
  `id_badge` int NOT NULL,
  `data_ottenimento` datetime NOT NULL,
  PRIMARY KEY (`id_giocatore`,`id_badge`),
  KEY `id_badge` (`id_badge`),
  CONSTRAINT `giocatore_badge_ibfk_1` FOREIGN KEY (`id_giocatore`) REFERENCES `giocatore` (`id_giocatore`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `giocatore_badge_ibfk_2` FOREIGN KEY (`id_badge`) REFERENCES `badge` (`id_badge`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `giocatore_badge`
--

LOCK TABLES `giocatore_badge` WRITE;
/*!40000 ALTER TABLE `giocatore_badge` DISABLE KEYS */;
/*!40000 ALTER TABLE `giocatore_badge` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `messaggio`
--

DROP TABLE IF EXISTS `messaggio`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `messaggio` (
  `id_messaggio` int NOT NULL AUTO_INCREMENT,
  `testo` text NOT NULL,
  `data_ora` datetime NOT NULL,
  `stato` varchar(20) DEFAULT NULL,
  `id_giocatore` int DEFAULT NULL,
  `id_allenatore` int DEFAULT NULL,
  PRIMARY KEY (`id_messaggio`),
  KEY `id_giocatore` (`id_giocatore`),
  KEY `id_allenatore` (`id_allenatore`),
  CONSTRAINT `messaggio_ibfk_1` FOREIGN KEY (`id_giocatore`) REFERENCES `giocatore` (`id_giocatore`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `messaggio_ibfk_2` FOREIGN KEY (`id_allenatore`) REFERENCES `allenatore` (`id_allenatore`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `messaggio`
--

LOCK TABLES `messaggio` WRITE;
/*!40000 ALTER TABLE `messaggio` DISABLE KEYS */;
/*!40000 ALTER TABLE `messaggio` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `quiz`
--

DROP TABLE IF EXISTS `quiz`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `quiz` (
  `id_quiz` int NOT NULL AUTO_INCREMENT,
  `domanda` text NOT NULL,
  `risposta_corretta` varchar(1) NOT NULL,
  `opzione_b` varchar(255) NOT NULL,
  `opzione_c` varchar(255) NOT NULL,
  `punti` int NOT NULL,
  PRIMARY KEY (`id_quiz`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `quiz`
--

LOCK TABLES `quiz` WRITE;
/*!40000 ALTER TABLE `quiz` DISABLE KEYS */;
/*!40000 ALTER TABLE `quiz` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `risposta_giocatore`
--

DROP TABLE IF EXISTS `risposta_giocatore`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `risposta_giocatore` (
  `id_risposta` bigint NOT NULL AUTO_INCREMENT,
  `corretta` bit(1) NOT NULL,
  `risposta_data` varchar(1) NOT NULL,
  `secondi_impiegati` int DEFAULT NULL,
  `id_giocatore` bigint NOT NULL,
  `id_quiz` bigint NOT NULL,
  PRIMARY KEY (`id_risposta`),
  UNIQUE KEY `UKfa62yo231vh69nli1b7qo8dlf` (`id_giocatore`,`id_quiz`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `risposta_giocatore`
--

LOCK TABLES `risposta_giocatore` WRITE;
/*!40000 ALTER TABLE `risposta_giocatore` DISABLE KEYS */;
/*!40000 ALTER TABLE `risposta_giocatore` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `risposta_utente`
--

DROP TABLE IF EXISTS `risposta_utente`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `risposta_utente` (
  `id_risposta` int NOT NULL AUTO_INCREMENT,
  `risposta_data` datetime NOT NULL,
  `secondi_impiegati` int DEFAULT NULL,
  `esito` tinyint(1) NOT NULL,
  `id_giocatore` int DEFAULT NULL,
  `id_quiz` int DEFAULT NULL,
  `corretta` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id_risposta`),
  KEY `id_giocatore` (`id_giocatore`),
  KEY `id_quiz` (`id_quiz`),
  CONSTRAINT `risposta_utente_ibfk_1` FOREIGN KEY (`id_giocatore`) REFERENCES `giocatore` (`id_giocatore`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `risposta_utente_ibfk_2` FOREIGN KEY (`id_quiz`) REFERENCES `quiz` (`id_quiz`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `risposta_utente`
--

LOCK TABLES `risposta_utente` WRITE;
/*!40000 ALTER TABLE `risposta_utente` DISABLE KEYS */;
/*!40000 ALTER TABLE `risposta_utente` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ruolo`
--

DROP TABLE IF EXISTS `ruolo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ruolo` (
  `id_ruolo` int NOT NULL AUTO_INCREMENT,
  `nome_ruolo` enum('ALLENATORE','DIRIGENZA','GIOCATORE','IT','STAFF') NOT NULL,
  PRIMARY KEY (`id_ruolo`),
  UNIQUE KEY `UKdoa35hkbluv8mir8vii25d9ni` (`nome_ruolo`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ruolo`
--

LOCK TABLES `ruolo` WRITE;
/*!40000 ALTER TABLE `ruolo` DISABLE KEYS */;
INSERT INTO `ruolo` VALUES (1,'ALLENATORE'),(5,'DIRIGENZA'),(4,'GIOCATORE'),(3,'IT'),(2,'STAFF');
/*!40000 ALTER TABLE `ruolo` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `squadra`
--

DROP TABLE IF EXISTS `squadra`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `squadra` (
  `id_squadra` int NOT NULL AUTO_INCREMENT,
  `nome` varchar(100) NOT NULL,
  `categoria` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id_squadra`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `squadra`
--

LOCK TABLES `squadra` WRITE;
/*!40000 ALTER TABLE `squadra` DISABLE KEYS */;
INSERT INTO `squadra` VALUES (1,'Juvenut','prima squadra maschile');
/*!40000 ALTER TABLE `squadra` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `statistiche`
--

DROP TABLE IF EXISTS `statistiche`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `statistiche` (
  `id_statistica` int NOT NULL AUTO_INCREMENT,
  `presenze` int DEFAULT '0',
  `presenze_titolare` int DEFAULT '0',
  `minuti_giocati` int DEFAULT '0',
  `goal_rigore` int DEFAULT '0',
  `goal_testa` int DEFAULT '0',
  `goal_punizione` int DEFAULT '0',
  `assist` int DEFAULT '0',
  `tiri_totali` int DEFAULT '0',
  `tiri_in_porta` int DEFAULT '0',
  `pali_traverse` int DEFAULT '0',
  `big_chance_mancate` int DEFAULT '0',
  `big_chance_create` int DEFAULT '0',
  `passaggi_tentati` int DEFAULT '0',
  `passaggi_riusciti` int DEFAULT '0',
  `passaggi_chiave` int DEFAULT '0',
  `cross_tentati` int DEFAULT '0',
  `cross_riusciti` int DEFAULT '0',
  `dribbling_tentati` int DEFAULT '0',
  `dribbling_riusciti` int DEFAULT '0',
  `duelli_vinti` int DEFAULT '0',
  `duelli_persi` int DEFAULT '0',
  `duelli_aerei_vinti` int DEFAULT '0',
  `duelli_aerei_persi` int DEFAULT '0',
  `palloni_rubati` int DEFAULT '0',
  `palloni_intercettati` int DEFAULT '0',
  `tackle` int DEFAULT '0',
  `falli_commessi` int DEFAULT '0',
  `falli_subiti` int DEFAULT '0',
  `ammonizioni` int DEFAULT '0',
  `espulsioni` int DEFAULT '0',
  `id_giocatore` int DEFAULT NULL,
  PRIMARY KEY (`id_statistica`),
  UNIQUE KEY `id_giocatore` (`id_giocatore`),
  CONSTRAINT `statistiche_ibfk_1` FOREIGN KEY (`id_giocatore`) REFERENCES `giocatore` (`id_giocatore`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `statistiche`
--

LOCK TABLES `statistiche` WRITE;
/*!40000 ALTER TABLE `statistiche` DISABLE KEYS */;
INSERT INTO `statistiche` VALUES (1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1),(2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2),(3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3),(4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4),(5,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5),(6,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,6),(7,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,7),(8,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,8),(9,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,9),(10,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,10),(11,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,11),(12,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,12),(13,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,13),(14,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,14),(15,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,15),(16,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,16),(17,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,17),(18,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,18),(19,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,19),(20,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,20),(21,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,21),(22,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,22),(23,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,23),(24,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,24),(25,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,25),(26,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,26);
/*!40000 ALTER TABLE `statistiche` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `utente`
--

DROP TABLE IF EXISTS `utente`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `utente` (
  `id_user` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `id_ruolo` int DEFAULT NULL,
  PRIMARY KEY (`id_user`),
  UNIQUE KEY `username` (`username`),
  KEY `id_ruolo` (`id_ruolo`),
  CONSTRAINT `utente_ibfk_1` FOREIGN KEY (`id_ruolo`) REFERENCES `ruolo` (`id_ruolo`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=30 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `utente`
--

LOCK TABLES `utente` WRITE;
/*!40000 ALTER TABLE `utente` DISABLE KEYS */;
INSERT INTO `utente` VALUES (1,'admin','$2a$12$P4U5Q1zMHk117wU/xAbpI.EKLMRyS3ewaRNJxj0IQSr6yDaaLSMCG',3),(2,'mister','$2a$12$y7lIy7DxChDVsxbnYxBOJuIouMi0l7vva/nxkftyhIAyKwoXvO3o6',1),(3,'digregorio','$2a$12$94G9rDWAthhwH20hLhpK9eVS0U7Ve1.SQsQgQlPindMa2oypnZNye',4),(4,'perin','$2a$12$brpiL54QMQU6sJKQHb.oj.bS/hklE3JmI7BQnchbSjsCo6xwvHoXW',4),(5,'pinsoglio','$2a$12$zVfReRQsV4k.9Fn8UflLAe7Kp/uRFTKVz7w2gr5BPcUcOnKoACB0W',4),(6,'gatti','$2a$12$VAUnrUZXZi52ATJkRJzg0exk/TxcKXj9s1AFP8qnnk5/.AQaBXXjy',4),(7,'bremer','$2a$12$KLfGEL0.MuHaOmuqFq8iVu5n1aLUZgjCRzJ4Xgqs0LnMUSp.DOT..',4),(8,'cabal','$2a$12$Wnq4jY4rj74YZ.eHZ7QjC.FJB8NPwyTFx9bnlOPCeLN.756ih6WJq',4),(9,'kalulu','$2a$12$PYT9ImMbgt1opbKep49X8uC6fDDt80urdEzamLbkA2qWAMHNwL/fa',4),(10,'kelly','$2a$12$hB7tD09TY82NDEe8M0V4eutp/XcEB0N2RaRQNszxdAUKnHgbCOooe',4),(11,'rugani','$2a$12$FjuKYGb3ry.P2jsYW8v1l.FaIQhBbgAs43XORXIFDoXNxyScFVS1i',4),(12,'cambiaso','$2a$12$YzYQYuxFvblG1sl6XsKOveyDfT6w9bAg99oOAQ9ux15sHLb86f8PG',4),(13,'locatelli','$2a$12$iEtHyyer1pykIAtROYMJ4ey7l5aYtbFMifsTQ.t5tU7BB1gvh.Ymi',4),(14,'thuram','$2a$12$mYFFiD2gjY9k99W96NTMcu/N3MaLrNbgu0Yv8CrZsV5nCyv2wfGBq',4),(15,'koopmeiners','$2a$12$JGc.qeIIk6nTrulZXujseO2EDDvMZUUfFPSrP0G8dmhtjjuvQrXBe',4),(16,'mckennie','$2a$12$1TOEVxNqltTzrzGATqlWAOu3xEsoriYUlzPcjY1MyKCmy7RTSs2KC',4),(17,'douglasluiz','$2a$12$dxikaMtXIOpI/6oU1oPxvO3JNdt3GRmcBrvgj1m0oDGravYqRt.QC',4),(18,'miretti','$2a$12$krOJ.48Oyg/oTAlOh1/xPezvyLHhLWUEifb8MKx3iQCPj7qGxUyMu',4),(19,'adzic','$2a$12$LaMEc00X3.IsNfeyE18LweCDKMZuWJ54NPwfFwzpKDeBGfGcnBz3G',4),(20,'yildiz','$2a$12$nIId3dnUPIAUZFUPS6wdgudz0714mGSpHw77G1xiaj3eK8RwZeFUC',4),(21,'conceicao','$2a$12$Guz8xgHlSar8sX7o/qMjZ.vNNibRk3mBufSxhxdhpOYRZ5LoY01WK',4),(22,'gonzalez','$2a$12$V7qFy1GHetJ4O.kKkkIQ5uT.BFvvyrkTO9Re8HCLwH8IZf9zKekOS',4),(23,'milik','$2a$12$v0QaJ8APKwFf1hRzyJSLDu3/LxyzoHBb6pyuJuvQ9dquN3hH3V4fS',4),(24,'openda','$2a$12$eT8j5o2YPZOUO6pozOoSFuUhYbErt7NYkF3pL/7IZPdfIdflLLGAC',4),(25,'boga','$2a$12$hX7Z8RKblw2rIQuvO3JldOTkMEKsk8eYLgBFyXxNsrexVJBQi.sRi',4),(26,'zhegrova','$2a$12$jyoEF8Ljzcr/3K4BKp8PXunN.OJ9E7.3AvGLJk8ZWWM8maR.BsJPS',4),(27,'david','$2a$12$Et0TBXkxikQ9LWMTqMGg2O/HWNBEp/luNiL8.h6VBxJ5dCXq7zdSq',4),(28,'ekhator','$2a$12$gLefw/TVbyxUgFFOgtI1IOmEeGzL6HrlGmjllNhx5JElrt0KKFhU2',4),(29,'celik','$2a$12$pPU3fEWRR6fj/t6BspvEsuhn/vFBSq62kiH.eM0kbNiTrXv9vFumq',4);
/*!40000 ALTER TABLE `utente` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-07-18 18:21:52
