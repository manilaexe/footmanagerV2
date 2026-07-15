-- MySQL dump 10.13  Distrib 8.0.46, for Win64 (x86_64)
--
-- Host: localhost    Database: footmanager
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `allenatore`
--

LOCK TABLES `allenatore` WRITE;
/*!40000 ALTER TABLE `allenatore` DISABLE KEYS */;
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
  `descrizione` text,
  `soglia_punti` int DEFAULT '0',
  `immagine_icona` varchar(255) DEFAULT NULL,
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
  `permessi` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id_calendar`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `calendario`
--

LOCK TABLES `calendario` WRITE;
/*!40000 ALTER TABLE `calendario` DISABLE KEYS */;
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
  `titolo` varchar(100) NOT NULL,
  `data_ora_inizio` datetime NOT NULL,
  `data_ora_fine` datetime NOT NULL,
  `tipo` varchar(50) DEFAULT NULL,
  `luogo` varchar(100) DEFAULT NULL,
  `id_calendar` int DEFAULT NULL,
  PRIMARY KEY (`id_evento`),
  KEY `id_calendar` (`id_calendar`),
  CONSTRAINT `evento_ibfk_1` FOREIGN KEY (`id_calendar`) REFERENCES `calendario` (`id_calendar`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `evento`
--

LOCK TABLES `evento` WRITE;
/*!40000 ALTER TABLE `evento` DISABLE KEYS */;
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
  `nazionalitÃ ` varchar(50) DEFAULT NULL,
  `altezza` int DEFAULT NULL,
  `id_squadra` int DEFAULT NULL,
  `id_user` int DEFAULT NULL,
  PRIMARY KEY (`id_giocatore`),
  KEY `id_squadra` (`id_squadra`),
  KEY `id_user` (`id_user`),
  CONSTRAINT `giocatore_ibfk_1` FOREIGN KEY (`id_squadra`) REFERENCES `squadra` (`id_squadra`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `giocatore_ibfk_2` FOREIGN KEY (`id_user`) REFERENCES `utente` (`id_user`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `giocatore`
--

LOCK TABLES `giocatore` WRITE;
/*!40000 ALTER TABLE `giocatore` DISABLE KEYS */;
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
  `risposta_corretta` varchar(255) NOT NULL,
  `opzione_2` varchar(255) NOT NULL,
  `opzione_3` varchar(255) NOT NULL,
  `punti_valore` int DEFAULT '0',
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
-- Table structure for table `risposta_utente`
--

DROP TABLE IF EXISTS `risposta_utente`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `risposta_utente` (
  `id_risposta` int NOT NULL AUTO_INCREMENT,
  `data_risposta` datetime NOT NULL,
  `tempo_impiegato_sec` int DEFAULT NULL,
  `esito` tinyint(1) NOT NULL,
  `id_giocatore` int DEFAULT NULL,
  `id_quiz` int DEFAULT NULL,
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
  `nome_ruolo` varchar(50) NOT NULL,
  PRIMARY KEY (`id_ruolo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ruolo`
--

LOCK TABLES `ruolo` WRITE;
/*!40000 ALTER TABLE `ruolo` DISABLE KEYS */;
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `squadra`
--

LOCK TABLES `squadra` WRITE;
/*!40000 ALTER TABLE `squadra` DISABLE KEYS */;
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
  `goal_di_testa` int DEFAULT '0',
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `statistiche`
--

LOCK TABLES `statistiche` WRITE;
/*!40000 ALTER TABLE `statistiche` DISABLE KEYS */;
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `utente`
--

LOCK TABLES `utente` WRITE;
/*!40000 ALTER TABLE `utente` DISABLE KEYS */;
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

-- Dump completed on 2026-05-25 10:04:32