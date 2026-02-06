
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
    
    // 1. LOGO POSITIONING
    try {
      const spLogo = await getBase64ImageFromUrl(LOGO_SEMEN_PADANG);
      const sigLogo = await getBase64ImageFromUrl(LOGO_SIG);
      doc.addImage(spLogo, 'PNG', 15, 8, 20, 20, undefined, 'FAST');
      doc.addImage(sigLogo, 'PNG', 150, 8, 45, 20, undefined, 'FAST');
    } catch (err) {
      console.warn("Logos failed to load", err);
    }

    // Header Text
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(COMPANY_NAME, 105, 16, { align: "center" });
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(COMPANY_ADDRESS, 105, 21, { align: "center" });
    
    // Kop Line
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(15, 30, 195, 30);

    // Judul Dokumen
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("LAPORAN REKAPITULASI PRESENSI BULANAN", 105, 40, { align: "center" });
    doc.setFontSize(9);
    doc.text(`${monthNames[month].toUpperCase()} ${year}`, 105, 45, { align: "center" });

    // Identitas Ringkas
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("DATA PESERTA:", 15, 54);
    doc.setFont("helvetica", "normal");
    doc.text(`Nama: ${user.name}  |  Unit: ${user.division || '-'}  |  Asal: ${user.university}`, 15, 58);

    // 2. TABEL PRESENSI (Ditambah Kolom Keterangan)
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
      startY: 64,
      head: [['NO', 'TANGGAL', 'MASUK', 'PULANG', 'STATUS', 'KETERANGAN']],
      body: tableData,
      theme: 'grid',
      headStyles: { 
        fillColor: [0, 0, 0], 
        textColor: [255, 255, 255], 
        fontStyle: 'bold',
        halign: 'center',
        fontSize: 7,
        lineColor: [0, 0, 0],
        lineWidth: 0.1
      },
      styles: { 
        fontSize: 6.5, 
        cellPadding: 1.2, 
        valign: 'middle',
        font: 'helvetica',
        lineColor: [0, 0, 0],
        lineWidth: 0.1,
        textColor: [0, 0, 0]
      },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 25, halign: 'center' },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 20, halign: 'center' },
        4: { cellWidth: 25, halign: 'center', fontStyle: 'bold' },
        5: { cellWidth: 'auto' } // Keterangan fleksibel
      },
      margin: { left: 15, right: 15 }
    });

    // Tanda Tangan
    let finalY = (doc as any).lastAutoTable?.finalY || 100;
    finalY += 15;
    
    if (finalY > 260) {
      doc.addPage();
      finalY = 20;
    }
    
    doc.setFontSize(8);
    doc.text(`Dicetak pada: ${format(new Date(), 'dd MMMM yyyy HH:mm', { locale: localeId })}`, 15, finalY);
    
    const sigY = finalY + 10;
    doc.setFont("helvetica", "bold");
    doc.text("Pembimbing Lapangan,", 15, sigY);
    doc.text("Peserta Magang,", 155, sigY);
    
    const nameY = sigY + 25;
    doc.text(user.supervisorName || "____________________", 15, nameY);
    doc.text(user.name, 155, nameY);

    const fileName = `Laporan_Bulanan_${user.name.replace(/\s+/g, '_')}_${monthNames[month]}.pdf`;
    doc.save(fileName);
    
    Swal.fire({ icon: 'success', title: 'Berhasil', text: 'Laporan bulanan telah diunduh.', timer: 2000, showConfirmButton: false });
    
  } catch (error) {
    console.error("PDF Error:", error);
    Swal.fire('Gagal', 'Terjadi kesalahan teknis pembuatan PDF.', 'error');
  }
};
