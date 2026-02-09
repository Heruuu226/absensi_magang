import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AttendanceRecord, User, AttendanceStatus } from '../types';
import { COMPANY_NAME, COMPANY_ADDRESS, LOGO_SIG, LOGO_SEMEN_PADANG } from '../constants';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale/id';
import Swal from 'sweetalert2';

const getBase64ImageFromUrl = async (url: string): Promise<string> => {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Status response tidak OK: ${res.status}`);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') resolve(reader.result);
        else reject(new Error("Gagal konversi gambar"));
      };
      reader.onerror = () => reject(new Error("Error baca blob"));
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn(`PDF Image Helper Warning (URL: ${url}):`, error);
    throw error;
  }
};

export const exportAttendancePDF = async (user: User, records: AttendanceRecord[], month: number, year: number) => {
  try {
    const doc = new jsPDF('p', 'mm', 'a4');
    const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    
    // === LOGO POSITIONING - DIPERBAIKI ===
    // Logo sejajar secara vertikal dan ukuran yang konsisten
    const logoSize = 25; // Ukuran logo yang sama
    const logoY = 10; // Posisi Y yang sama untuk kedua logo
    const leftMargin = 15;
    const rightMargin = 195 - logoSize; // Dari kanan margin
    
    try {
      const spLogo = await getBase64ImageFromUrl(LOGO_SEMEN_PADANG);
      const sigLogo = await getBase64ImageFromUrl(LOGO_SIG);
      
      // Logo kiri (Semen Padang) - sejajar
      doc.addImage(spLogo, 'PNG', leftMargin, logoY, logoSize, logoSize, undefined, 'FAST');
      
      // Logo kanan (SIG) - sejajar
      doc.addImage(sigLogo, 'PNG', rightMargin, logoY, logoSize, logoSize, undefined, 'FAST');
    } catch (err) {
      console.warn("Logos failed to load", err);
    }

    // === HEADER TEXT - DIPERBAIKI ===
    // Posisi header di tengah antara kedua logo
    const headerY = logoY + 8; // Mulai dari tengah logo
    
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text(COMPANY_NAME, 105, headerY, { align: "center" });
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.text(COMPANY_ADDRESS, 105, headerY + 5, { align: "center" });
    
    // === KOP LINE - DIPERBAIKI ===
    const lineY = logoY + logoSize + 3; // 3mm di bawah logo
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.8);
    doc.line(leftMargin, lineY, 195, lineY);
    
    // Garis bawah lebih tipis
    doc.setLineWidth(0.3);
    doc.line(leftMargin, lineY + 0.5, 195, lineY + 0.5);

    // === JUDUL DOKUMEN - DIPERBAIKI ===
    const titleY = lineY + 10;
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("LAPORAN REKAPITULASI PRESENSI BULANAN", 105, titleY, { align: "center" });
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`${monthNames[month].toUpperCase()} ${year}`, 105, titleY + 5, { align: "center" });

    // === IDENTITAS - DIPERBAIKI ===
    const identityY = titleY + 12;
    const labelWidth = 20; // Lebar kolom label
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    
    // Buat tabel info peserta yang rapi
    doc.text("Nama", leftMargin, identityY);
    doc.text(":", leftMargin + labelWidth, identityY);
    doc.setFont("helvetica", "normal");
    doc.text(user.name, leftMargin + labelWidth + 3, identityY);
    
    doc.setFont("helvetica", "bold");
    doc.text("Unit", leftMargin, identityY + 5);
    doc.text(":", leftMargin + labelWidth, identityY + 5);
    doc.setFont("helvetica", "normal");
    doc.text(user.division || '-', leftMargin + labelWidth + 3, identityY + 5);
    
    doc.setFont("helvetica", "bold");
    doc.text("Asal", leftMargin, identityY + 10);
    doc.text(":", leftMargin + labelWidth, identityY + 10);
    doc.setFont("helvetica", "normal");
    doc.text(user.university, leftMargin + labelWidth + 3, identityY + 10);

    // === TABEL PRESENSI - DIPERBAIKI ===
    const tableStartY = identityY + 17;
    const sortedRecords = [...records].sort((a, b) => a.date.localeCompare(b.date));
    
    const tableData = sortedRecords.map((r, i) => {
      let displayStatus = "ALPHA";
      const s = r.status;
      if ([AttendanceStatus.HADIR, AttendanceStatus.PULANG, AttendanceStatus.TERLAMBAT, AttendanceStatus.CUTI_BERSAMA].includes(s as AttendanceStatus)) {
        displayStatus = "HADIR";
      } else if ([AttendanceStatus.IZIN, AttendanceStatus.SAKIT].includes(s as AttendanceStatus)) {
        displayStatus = "IZIN / SAKIT";
      } else if (s === AttendanceStatus.ALPHA_SYSTEM || s === AttendanceStatus.ALPHA) {
        displayStatus = "ALPHA";
      }

      return [
        i + 1,
        format(new Date(r.date), 'dd/MM/yy', { locale: localeId }),
        r.clockIn || '--:--',
        r.clockOut || '--:--',
        displayStatus,
        r.note || '-'
      ];
    });

    autoTable(doc, {
      startY: tableStartY,
      head: [['NO', 'TANGGAL', 'MASUK', 'PULANG', 'STATUS', 'KETERANGAN']],
      body: tableData,
      theme: 'grid',
      headStyles: { 
        fillColor: [30, 41, 59], // Warna header lebih modern
        textColor: [255, 255, 255], 
        fontStyle: 'bold',
        halign: 'center',
        fontSize: 8,
        lineColor: [30, 41, 59],
        lineWidth: 0.1,
        cellPadding: 2
      },
      styles: { 
        fontSize: 7.5, 
        cellPadding: 2, 
        valign: 'middle',
        font: 'helvetica',
        lineColor: [200, 200, 200],
        lineWidth: 0.1,
        textColor: [0, 0, 0]
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 22, halign: 'center' },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 20, halign: 'center' },
        4: { cellWidth: 28, halign: 'center', fontStyle: 'bold' },
        5: { cellWidth: 'auto', halign: 'left' }
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252] // Zebra striping untuk mudah dibaca
      },
      margin: { left: leftMargin, right: 15 }
    });

    // === TANDA TANGAN - DIPERBAIKI ===
    let finalY = (doc as any).lastAutoTable?.finalY || 100;
    finalY += 12;
    
    if (finalY > 250) {
      doc.addPage();
      finalY = 20;
    }
    
    // Footer info
    doc.setFontSize(7);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(100, 100, 100);
    doc.text(`Dicetak pada: ${format(new Date(), 'dd MMMM yyyy, HH:mm', { locale: localeId })} WIB`, leftMargin, finalY);
    
    // Tanda tangan dengan layout yang lebih rapi
    const sigY = finalY + 8;
    const leftSigX = leftMargin;
    const rightSigX = 135; // Posisi TTD kanan
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    
    // TTD Kiri
    doc.text("Pembimbing Lapangan,", leftSigX, sigY);
    
    // TTD Kanan
    doc.text("Peserta Magang,", rightSigX, sigY);
    
    // Ruang untuk tanda tangan (30mm)
    const nameY = sigY + 20;
    
    // Garis untuk nama
    doc.setLineWidth(0.3);
    doc.line(leftSigX, nameY - 2, leftSigX + 50, nameY - 2);
    doc.line(rightSigX, nameY - 2, rightSigX + 50, nameY - 2);
    
    // Nama
    doc.setFont("helvetica", "bold");
    doc.text(user.supervisorName || "____________________", leftSigX, nameY);
    doc.text(user.name, rightSigX, nameY);
    
    // Jabatan/Status (opsional)
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(80, 80, 80);
    doc.text("Pembimbing", leftSigX, nameY + 4);
    doc.text("Peserta", rightSigX, nameY + 4);

    // === SAVE FILE ===
    const fileName = `Laporan_Bulanan_${user.name.replace(/\s+/g, '_')}_${monthNames[month]}_${year}.pdf`;
    doc.save(fileName);
    
    Swal.fire({ 
      icon: 'success', 
      title: 'Berhasil', 
      text: 'Laporan bulanan telah diunduh dengan format yang diperbaiki.', 
      timer: 2500, 
      showConfirmButton: false 
    });
    
  } catch (error) {
    console.error("PDF Error:", error);
    Swal.fire('Gagal', 'Terjadi kesalahan teknis pembuatan PDF.', 'error');
  }
};