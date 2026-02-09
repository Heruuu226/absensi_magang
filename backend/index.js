
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10
});

const SECRET = process.env.JWT_SECRET || 'secret';

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);
    jwt.verify(token, SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

const n = (val) => (val === undefined || val === "" ? null : val);

app.get('/api/time', (req, res) => {
    const now = new Date();
    res.json({ 
        iso: now.toISOString(),
        time: now.toTimeString().split(' ')[0].substring(0, 5),
        date: now.toISOString().split('T')[0]
    });
});

// API SETTINGS (GLOBAL JADWAL)
app.get('/api/settings', async (req, res) => {
    db.execute('SELECT config FROM settings WHERE id = 1', (err, results) => {
        if (err || results.length === 0) return res.json({ 
            clockInStart: "08:00", clockInEnd: "08:30", clockOutStart: "17:00", clockOutEnd: "23:59", operationalDays: [1, 2, 3, 4, 5], holidays: [] 
        });
        res.json(results[0].config);
    });
});

app.post('/api/settings', authenticateToken, (req, res) => {
    const config = req.body;
    db.execute('UPDATE settings SET config = ? WHERE id = 1', [JSON.stringify(config)], (err) => {
        if (err) return res.status(500).json({ message: "Gagal update jadwal" });
        res.json({ success: true });
    });
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    db.execute('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
        if (err) return res.status(500).json({ message: "Kesalahan Database" });
        if (results.length === 0) return res.status(401).json({ message: "Email atau Password salah." });
        
        const user = results[0];
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(401).json({ message: "Email atau Password salah." });
        
        const token = jwt.sign({ id: user.id, role: user.role }, SECRET, { expiresIn: '7d' });
        delete user.password;
        delete user.plain_password;
        res.json({ user, token });
    });
});

app.post('/api/register', async (req, res) => {
    const u = req.body;
    try {
        const hashedPassword = await bcrypt.hash(u.password, 10);
        const sql = `INSERT INTO users (id, name, email, password, plain_password, role, accountStatus, university, major, division, phone, startDate, endDate) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`;
        
        db.execute(sql, [
            n(u.id), n(u.name), n(u.email), hashedPassword, n(u.password), 
            'PESERTA MAGANG', 'PENDING', n(u.university), n(u.major), 
            n(u.division), n(u.phone), n(u.startDate), n(u.endDate)
        ], (err) => {
            if (err) {
                console.error("MySQL Error:", err);
                if (err.code === 'ER_DUP_ENTRY') return res.status(500).json({ message: "Email atau ID sudah terdaftar." });
                return res.status(500).json({ message: "Gagal menyimpan: " + err.message });
            }
            res.json({ success: true });
        });
    } catch (e) {
        res.status(500).json({ message: "Gagal memproses registrasi." });
    }
});

app.post('/api/attendance', authenticateToken, (req, res) => {
    const a = req.body;
    const dateStr = a.date && a.date.includes('T') ? a.date.split('T')[0] : a.date;
    if (a.clockOut) {
        db.execute('UPDATE attendance SET clockOut=?, photoOut=?, latOut=?, lngOut=?, status=?, note=? WHERE userId=? AND date=?', 
        [n(a.clockOut), n(a.photoOut), n(a.latOut), n(a.lngOut), n(a.status), n(a.note), n(a.userId), n(dateStr)], (e) => {
            if (e) return res.status(500).json({ message: e.message });
            res.json({ success: true });
        });
    } else {
        const sql = `INSERT INTO attendance (id, userId, userName, date, clockIn, status, lateMinutes, photoIn, latIn, lngIn, note) VALUES (?,?,?,?,?,?,?,?,?,?,?)`;
        db.execute(sql, [n(a.id), n(a.userId), n(a.userName), n(dateStr), n(a.clockIn), n(a.status), n(a.lateMinutes) || 0, n(a.photoIn), n(a.latIn), n(a.lngIn), n(a.note)], (e) => {
            if (e) return res.status(500).json({ message: e.message });
            res.json({ success: true });
        });
    }
});

app.get('/api/attendance/:userId', authenticateToken, (req, res) => {
    db.execute(`SELECT *, DATE_FORMAT(date, '%Y-%m-%d') as date FROM attendance WHERE userId = ? ORDER BY date DESC`, [req.params.userId], (err, results) => res.json(results));
});

app.get('/api/users', authenticateToken, (req, res) => {
    db.execute('SELECT id, name, email, plain_password as password, role, accountStatus, university, major, division, phone, startDate, endDate, supervisorName, supervisorId FROM users', (err, results) => res.json(results));
});

app.post('/api/users/update', authenticateToken, async (req, res) => {
    const u = req.body;
    let sql = `UPDATE users SET name=?, email=?, university=?, major=?, division=?, phone=?, photoUrl=?, supervisorId=?, supervisorName=?, accountStatus=? WHERE id=?`;
    let params = [n(u.name), n(u.email), n(u.university), n(u.major), n(u.division), n(u.phone), n(u.photoUrl), n(u.supervisorId), n(u.supervisorName), n(u.accountStatus), n(u.id)];
    if (u.password && u.password.length > 0) {
        const hp = await bcrypt.hash(u.password, 10);
        sql = `UPDATE users SET name=?, email=?, password=?, plain_password=?, university=?, major=?, division=?, phone=?, photoUrl=?, supervisorId=?, supervisorName=?, accountStatus=? WHERE id=?`;
        params = [n(u.name), n(u.email), hp, n(u.password), n(u.university), n(u.major), n(u.division), n(u.phone), n(u.photoUrl), n(u.supervisorId), n(u.supervisorName), n(u.accountStatus), n(u.id)];
    }
    db.execute(sql, params, (err) => res.json({ success: true }));
});

app.get('/api/permits', authenticateToken, (req, res) => {
    db.execute("SELECT *, DATE_FORMAT(date, '%Y-%m-%d') as date FROM permits ORDER BY date DESC", (err, results) => res.json(results));
});

app.get('/api/permits/:userId', authenticateToken, (req, res) => {
    db.execute("SELECT *, DATE_FORMAT(date, '%Y-%m-%d') as date FROM permits WHERE userId = ? ORDER BY date DESC", [req.params.userId], (err, results) => res.json(results));
});

app.post('/api/permits', authenticateToken, (req, res) => {
    const p = req.body;
    const sql = `INSERT INTO permits (id, userId, userName, type, date, reason, fileUrl, status, lat, lng) VALUES (?,?,?,?,?,?,?,?,?,?)`;
    db.execute(sql, [n(p.id), n(p.userId), n(p.userName), n(p.type), n(p.date), n(p.reason), n(p.fileUrl), 'Pending', n(p.lat), n(p.lng)], (err) => {
        if (err) return res.status(500).json({ message: "Sudah ada pengajuan hari ini." });
        res.json({ success: true });
    });
});

app.post('/api/permits/status', authenticateToken, (req, res) => {
    const { id, status } = req.body;
    db.execute('SELECT * FROM permits WHERE id = ?', [id], (err, results) => {
        if (err || results.length === 0) return res.status(404).json({ message: "Pengajuan tidak ditemukan" });
        const p = results[0];
        const dateStr = p.date instanceof Date ? p.date.toISOString().split('T')[0] : p.date;
        db.execute('UPDATE permits SET status = ? WHERE id = ?', [status, id], (err) => {
            if (err) return res.status(500).json({ message: "Gagal update status" });
            let attStatus = p.type;
            let note = `Pengajuan ${p.type} disetujui: ${p.reason}`;
            if (status === 'Rejected') { attStatus = 'Alpha'; note = `Ditolak Admin: ${p.reason}`; }
            const attId = `ATT-PRM-${p.id}`;
            const sqlAtt = `INSERT INTO attendance (id, userId, userName, date, clockIn, clockOut, status, note) VALUES (?, ?, ?, ?, NULL, NULL, ?, ?) ON DUPLICATE KEY UPDATE status = VALUES(status), note = VALUES(note)`;
            db.execute(sqlAtt, [attId, p.userId, p.userName, dateStr, attStatus, note], (e) => res.json({ success: true }));
        });
    });
});

app.get('/api/edit-requests', authenticateToken, (req, res) => {
    db.execute("SELECT *, DATE_FORMAT(date, '%Y-%m-%d') as date FROM edit_requests ORDER BY createdAt DESC", (err, results) => res.json(results));
});

app.post('/api/edit-requests', authenticateToken, (req, res) => {
    const r = req.body;
    const dateStr = r.date && r.date.includes('T') ? r.date.split('T')[0] : r.date;
    db.execute('SELECT id FROM edit_requests WHERE attendanceId = ? AND status = "Pending"', [r.attendanceId], (err, results) => {
        if (err) return res.status(500).json({ message: "Kesalahan validasi server." });
        if (results.length > 0) return res.status(400).json({ message: "Anda masih memiliki pengajuan koreksi yang menunggu validasi admin untuk tanggal ini." });
        const sql = `INSERT INTO edit_requests (id, attendanceId, userId, userName, date, requestedIn, requestedOut, requestedStatus, reason, status) VALUES (?,?,?,?,?,?,?,?,?,?)`;
        db.execute(sql, [n(r.id), n(r.attendanceId), n(r.userId), n(r.userName), n(dateStr), n(r.requestedIn), n(r.requestedOut), n(r.requestedStatus), n(r.reason), 'Pending'], (err) => {
            if (err) return res.status(500).json({ message: "Gagal mengajukan koreksi." });
            res.json({ success: true });
        });
    });
});

app.post('/api/edit-requests/status', authenticateToken, (req, res) => {
    const { id, status } = req.body;
    if (status === 'Approved') {
        db.execute('SELECT * FROM edit_requests WHERE id = ?', [id], (err, results) => {
            if (results.length > 0) {
                const r = results[0];
                const sqlUpdateAtt = 'UPDATE attendance SET clockIn = ?, clockOut = ?, status = ?, note = ? WHERE id = ?';
                const systemNote = 'Sistem: telah dikoreksi oleh admin dan pembimbing';
                
                db.execute(sqlUpdateAtt, [r.requestedIn, r.requestedOut, r.requestedStatus, systemNote, r.attendanceId], (errUpdate) => {
                    db.execute('UPDATE edit_requests SET status = ? WHERE id = ?', [status, id], () => res.json({ success: true }));
                });
            } else res.json({ success: false });
        });
    } else {
        db.execute('UPDATE edit_requests SET status = ? WHERE id = ?', [status, id], (err) => res.json({ success: true }));
    }
});

app.delete('/api/users/:id', authenticateToken, (req, res) => {
    db.execute('DELETE FROM users WHERE id = ?', [req.params.id], (err) => res.json({ success: true }));
});

app.get('/api/supervisors', authenticateToken, (req, res) => {
    db.execute('SELECT * FROM supervisors', (err, results) => res.json(results));
});

app.post('/api/supervisors', authenticateToken, (req, res) => {
    const s = req.body;
    const sql = 'INSERT INTO supervisors (id, name, division, employeeId) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE name=?, division=?';
    db.execute(sql, [n(s.id), n(s.name), n(s.division), n(s.employeeId), n(s.name), n(s.division)], (err) => res.json({ success: true }));
});

app.delete('/api/supervisors/:id', authenticateToken, (req, res) => {
    db.execute('DELETE FROM supervisors WHERE id = ?', [req.params.id], (err) => res.json({ success: true }));
});

app.listen(process.env.PORT || 3001, () => console.log(`🚀 Secure Server Ready`));
