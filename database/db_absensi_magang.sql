-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Waktu pembuatan: 09 Feb 2026 pada 02.23
-- Versi server: 10.4.28-MariaDB
-- Versi PHP: 8.2.4

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `db_absensi_magang`
--

-- --------------------------------------------------------

--
-- Struktur dari tabel `attendance`
--

CREATE TABLE `attendance` (
  `id` varchar(50) NOT NULL,
  `userId` varchar(50) DEFAULT NULL,
  `userName` varchar(100) DEFAULT NULL,
  `date` date DEFAULT NULL,
  `clockIn` time DEFAULT NULL,
  `clockOut` time DEFAULT NULL,
  `status` enum('Hadir','Terlambat','Izin','Sakit','Alpha','Alpha (Sistem)','Pulang','Cuti Bersama') NOT NULL,
  `lateMinutes` int(11) DEFAULT 0,
  `photoIn` longtext DEFAULT NULL,
  `photoOut` longtext DEFAULT NULL,
  `latIn` double DEFAULT NULL,
  `lngIn` double DEFAULT NULL,
  `latOut` double DEFAULT NULL,
  `lngOut` double DEFAULT NULL,
  `note` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `edit_requests`
--

CREATE TABLE `edit_requests` (
  `id` varchar(50) NOT NULL,
  `attendanceId` varchar(50) DEFAULT NULL,
  `userId` varchar(50) DEFAULT NULL,
  `userName` varchar(100) DEFAULT NULL,
  `date` date DEFAULT NULL,
  `requestedIn` time DEFAULT NULL,
  `requestedOut` time DEFAULT NULL,
  `requestedStatus` enum('Hadir','Terlambat','Izin','Sakit','Alpha','Alpha (Sistem)','Pulang','Cuti Bersama') DEFAULT NULL,
  `reason` text DEFAULT NULL,
  `status` enum('Pending','Approved','Rejected') DEFAULT 'Pending',
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `permits`
--

CREATE TABLE `permits` (
  `id` varchar(50) NOT NULL,
  `userId` varchar(50) DEFAULT NULL,
  `userName` varchar(100) DEFAULT NULL,
  `type` enum('Izin','Sakit') DEFAULT NULL,
  `date` date DEFAULT NULL,
  `reason` text DEFAULT NULL,
  `fileUrl` longtext DEFAULT NULL,
  `status` enum('Pending','Approved','Rejected') DEFAULT 'Pending',
  `lat` double DEFAULT NULL,
  `lng` double DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `settings`
--

CREATE TABLE `settings` (
  `id` int(11) NOT NULL DEFAULT 1,
  `config` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`config`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `settings`
--

INSERT INTO `settings` (`id`, `config`) VALUES
(1, '{\"clockInStart\": \"08:00\", \"clockInEnd\": \"08:30\", \"clockOutStart\": \"17:00\", \"clockOutEnd\": \"23:59\", \"operationalDays\": [1, 2, 3, 4, 5], \"holidays\": []}');

-- --------------------------------------------------------

--
-- Struktur dari tabel `supervisors`
--

CREATE TABLE `supervisors` (
  `id` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `division` varchar(100) DEFAULT NULL,
  `employeeId` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Struktur dari tabel `users`
--

CREATE TABLE `users` (
  `id` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `plain_password` varchar(255) DEFAULT NULL,
  `role` enum('ADMIN','PESERTA MAGANG') DEFAULT 'PESERTA MAGANG',
  `accountStatus` enum('PENDING','ACTIVE','INACTIVE') DEFAULT 'PENDING',
  `university` varchar(100) DEFAULT NULL,
  `major` varchar(100) DEFAULT NULL,
  `division` varchar(100) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `photoUrl` longtext DEFAULT NULL,
  `supervisorId` varchar(50) DEFAULT NULL,
  `supervisorName` varchar(100) DEFAULT NULL,
  `startDate` date DEFAULT NULL,
  `endDate` date DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `password`, `plain_password`, `role`, `accountStatus`, `university`, `major`, `division`, `phone`, `photoUrl`, `supervisorId`, `supervisorName`, `startDate`, `endDate`, `createdAt`) VALUES
('ADM-001', 'Admin PT Semen Padang', 'admin@sp.com', '$2a$12$bAztdxuqE9VdXcjibVLoNeSXwav0jfhc48nnWhe7IHyAl5gvCHN6W', '', 'ADMIN', 'ACTIVE', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-02-06 14:27:26'),
('USR-1770599089694', 'Allan Bertha Pamungkas', 'allan@gmail.com', '$2b$10$UllmU8k.gzYRGxnDx7kYo.zoZhgMcCsC/2vAxi2drphdL4uvhX/2C', 'Admin123!', 'PESERTA MAGANG', 'ACTIVE', 'SMK', 'RPL', 'ICT', '081374066120', NULL, NULL, NULL, '2026-02-09', '2026-04-30', '2026-02-09 01:04:49');

--
-- Indexes for dumped tables
--

--
-- Indeks untuk tabel `attendance`
--
ALTER TABLE `attendance`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_user_date` (`userId`,`date`);

--
-- Indeks untuk tabel `edit_requests`
--
ALTER TABLE `edit_requests`
  ADD PRIMARY KEY (`id`),
  ADD KEY `userId` (`userId`);

--
-- Indeks untuk tabel `permits`
--
ALTER TABLE `permits`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_permit_user_date` (`userId`,`date`);

--
-- Indeks untuk tabel `settings`
--
ALTER TABLE `settings`
  ADD PRIMARY KEY (`id`);

--
-- Indeks untuk tabel `supervisors`
--
ALTER TABLE `supervisors`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `employeeId` (`employeeId`);

--
-- Indeks untuk tabel `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Ketidakleluasaan untuk tabel pelimpahan (Dumped Tables)
--

--
-- Ketidakleluasaan untuk tabel `attendance`
--
ALTER TABLE `attendance`
  ADD CONSTRAINT `attendance_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `edit_requests`
--
ALTER TABLE `edit_requests`
  ADD CONSTRAINT `edit_requests_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Ketidakleluasaan untuk tabel `permits`
--
ALTER TABLE `permits`
  ADD CONSTRAINT `permits_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
