-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Waktu pembuatan: 06 Feb 2026 pada 03.20
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

--
-- Dumping data untuk tabel `attendance`
--

INSERT INTO `attendance` (`id`, `userId`, `userName`, `date`, `clockIn`, `clockOut`, `status`, `lateMinutes`, `photoIn`, `photoOut`, `latIn`, `lngIn`, `latOut`, `lngOut`, `note`) VALUES
('HOL-USR-1770344085317-2026-02-06', 'USR-1770344085317', 'Allan Bertha', '2026-02-06', NULL, NULL, 'Cuti Bersama', 0, NULL, NULL, NULL, NULL, NULL, NULL, 'Sistem: Hari Libur / Cuti Bersama.');

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
('ADM-001', 'Admin PT Semen Padang', 'admin@sp.com', '$2a$12$k6jXoiXQHLxGjC0nJ5oNk.t3S8O0/tSsuS5eDY0cNWFdxmm65Ry8e', '', 'ADMIN', 'ACTIVE', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-02-06 02:12:25'),
('USR-1770344085317', 'Allan Bertha', 'allan@gmail.com', '$2b$10$r4WRufdZ9DqkexPfZ.QaKeydGFSlJ0IDdi93GSDQk9DBlH1BBLfAO', 'Admin123!', 'PESERTA MAGANG', 'ACTIVE', 'SMK N 2 PADANG', 'PPLG', 'ICT', '081374066120', NULL, NULL, NULL, '2026-02-06', '2026-11-25', '2026-02-06 02:14:45');

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
