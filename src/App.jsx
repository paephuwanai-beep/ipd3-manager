import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Plus, 
  Printer, 
  CheckCircle, 
  AlertTriangle,
  Pill,
  Syringe,
  User,
  AlertOctagon,
  XCircle,
  Menu,
  Archive,
  Pencil,
  Save,
  BedDouble,
  Activity,
  UserPlus,
  LogOut,
  RotateCcw,
  FileDown,
  Database,
  RefreshCw,
  Cloud,
  Edit3,
  UserMinus,
  Image as ImageIcon,
  ClipboardList,
  Clock,
  ChevronRight,
  ChevronLeft,
  Ban,
  Users,
  Wine,
  Scale,
  Bell,
  ShieldAlert,
  Search,
  Trash2,
  Stethoscope,
  ActivitySquare,
  FileText,
  History
} from 'lucide-react';

// --- FIREBASE IMPORTS ---
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithCustomToken, 
  signInAnonymously, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot,
  query,
  writeBatch
} from 'firebase/firestore';
import { getAnalytics } from "firebase/analytics";

// --- FIREBASE SETUP ---
const firebaseConfig = {
  apiKey: "AIzaSyChjikReb-Kbx6wt5HXvEJY7t5c1n-Mpps",
  authDomain: "ipdmed.firebaseapp.com",
  projectId: "ipdmed",
  storageBucket: "ipdmed.firebasestorage.app",
  messagingSenderId: "399785662396",
  appId: "1:399785662396:web:0e215ac230cf1ed9e87db9",
  measurementId: "G-SVR2CZKS06"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

const getColl = (name) => collection(db, 'artifacts', appId, 'public', 'data', name);

// --- MOCK DATA FOR SEEDING ---
const SEED_PATIENTS = [
  {
    hn: "47834",
    an: "690000699",
    name: "นายวุฒินันท์ เปรมประยูร",
    ward: "ผู้ป่วยในชาย",
    bed: "18",
    hospital: "โรงพยาบาลคอนสาร",
    allergies: "Penicillin, Aspirin", 
    status: "admitted",
    diagnosis: "#Hypovolemic hypernatremia",
    doctor: "พญ.ศุภนิดา มหาพรม"
  }
];

const SEED_MEDS = [
  {
    barcode: "-",
    name: "Ceftriaxone 2 g",
    detail: "IV drip",
    instruction: "วันละ 1 ครั้ง",
    times: [10], 
    type: "injection",
    status: "active"
  },
  {
    barcode: "-",
    name: "DTX",
    detail: "เจาะน้ำตาลปลายนิ้ว",
    instruction: "",
    times: [6, 12, 18, 24], 
    type: "medcard",
    status: "active"
  }
];

// --- UTILS ---
const padHN = (hn) => {
  if (!hn || hn === '-' || hn === '0') return '0000000';
  return String(hn).trim().padStart(7, '0');
};

const getLocalDateString = (dateObj) => {
  const d = new Date(dateObj);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split('T')[0];
};

const generateDynamicDateRange = (patient, logs, retroDateStr) => {
    let minDate = new Date();
    minDate.setDate(minDate.getDate() - 1); 
    minDate.setHours(0,0,0,0);

    if (patient && patient.createdAt) {
        const ptDate = new Date(patient.createdAt);
        ptDate.setHours(0,0,0,0);
        if (ptDate < minDate) minDate = new Date(ptDate);
    }

    if (logs && logs.length > 0) {
        logs.forEach(l => {
            if (l.dateKey) {
                const lDate = new Date(l.dateKey);
                lDate.setHours(0,0,0,0);
                if (lDate < minDate) minDate = new Date(lDate);
            }
        });
    }

    if (retroDateStr) {
        const rDate = new Date(retroDateStr);
        rDate.setHours(0,0,0,0);
        if (rDate < minDate) minDate = new Date(rDate);
    }

    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() - 1); // ⚠️ แก้ไข: ให้จำกัดย้อนหลังสูงสุดแค่ 1 วัน
    limitDate.setHours(0,0,0,0);
    if (minDate < limitDate) minDate = new Date(limitDate);

    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 5); 
    maxDate.setHours(0,0,0,0);

    const dates = [];
    let curr = new Date(minDate);
    while (curr <= maxDate) {
        dates.push(new Date(curr));
        curr.setDate(curr.getDate() + 1);
    }
    return dates;
};

const formatDateThai = (date) => {
  const months = [
    "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
    "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
  ];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear() + 543}`;
};

const formatTime = (date) => {
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
};

const parseCSVData = (csv) => {
    let rows = [];
    let row = [];
    let inQuotes = false;
    let val = '';
    for (let i = 0; i < csv.length; i++) {
        let char = csv[i];
        let nextChar = csv[i+1];
        if (char === '"' && inQuotes && nextChar === '"') {
            val += '"'; i++; 
        } else if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            row.push(val.trim()); val = '';
        } else if ((char === '\n' || (char === '\r' && nextChar === '\n')) && !inQuotes) {
            if (char === '\r') i++;
            row.push(val.trim()); val = '';
            rows.push(row); row = [];
        } else {
            val += char;
        }
    }
    if (val !== '' || row.length > 0) {
        row.push(val.trim()); rows.push(row);
    }
    return rows;
};

// --- ALLERGY CHECK SYSTEM ---
const DRUG_GROUPS = {
  "penicillin": ["penicillin", "amoxicillin", "ampicillin", "augmentin", "amox", "amp", "curam"],
  "nsaid": ["aspirin", "ibuprofen", "naproxen", "diclofenac", "celecoxib", "nsaid", "ponstan", "mefenamic", "arcoxia", "celebrex", "ibu"],
  "cephalosporin": ["ceftriaxone", "cephalexin", "cefazolin", "cefotaxime", "ceftazidime", "cef"],
  "sulfa": ["bactrim", "sulfamethoxazole", "cotrimoxazole", "sulfasalazine", "sulfa"],
  "macrolide": ["azithromycin", "erythromycin", "clarithromycin", "roxithromycin"],
  "fluoroquinolone": ["ciprofloxacin", "levofloxacin", "moxifloxacin", "norfloxacin", "ofloxacin"]
};

const checkAllergyConflict = (newDrugName, patientAllergies) => {
  if (!patientAllergies || patientAllergies === '-' || patientAllergies.trim() === '') return null;
  const allergies = patientAllergies.split(',').map(a => a.trim().toLowerCase());
  const newDrug = newDrugName.toLowerCase();
  for (let allergy of allergies) {
    if (newDrug.includes(allergy) || allergy.includes(newDrug)) {
       return allergy;
    }
    for (let groupKey in DRUG_GROUPS) {
      const groupMembers = DRUG_GROUPS[groupKey];
      if (groupMembers.some(member => allergy.includes(member) || member.includes(allergy))) {
         if (groupMembers.some(member => newDrug.includes(member))) {
            return allergy; 
         }
      }
    }
  }
  return null;
};

// --- MAIN APP COMPONENT ---
export default function App() {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [appUser, setAppUser] = useState(null); 

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token).catch(() => signInAnonymously(auth));
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Firebase Auth Error", error);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
    });

    const script = document.createElement('script');
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
    script.async = true;
    document.body.appendChild(script);

    const fontLink = document.createElement('link');
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700;800&display=swap';
    fontLink.rel = 'stylesheet';
    document.head.appendChild(fontLink);

    const style = document.createElement('style');
    style.innerHTML = `
      body, .font-sans, input, button, select, textarea, table { 
        font-family: 'Sarabun', sans-serif !important; 
      }
      @import url('https://fonts.googleapis.com/css2?family=Libre+Barcode+39&display=swap');
      .barcode-text {
        font-family: 'Libre Barcode 39', cursive;
      }
      @keyframes gradient-xy {
          0%, 100% { background-size: 400% 400%; background-position: left center; }
          50% { background-size: 200% 200%; background-position: right center; }
      }
      .mesh-bg {
          background: linear-gradient(-45deg, #e0f2fe, #f3e8ff, #ccfbf1, #e0e7ff, #fce7f3);
          background-size: 400% 400%;
          animation: gradient-xy 15s ease infinite;
      }
      .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
      .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 10px; }
      .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
    `;
    document.head.appendChild(style);

    return () => {
      unsubscribe();
      if(document.body.contains(script)) document.body.removeChild(script);
      if(document.head.contains(fontLink)) document.head.removeChild(fontLink);
      if(document.head.contains(style)) document.head.removeChild(style);
    };
  }, []);

  if (!firebaseUser) {
    return <div className="h-screen flex items-center justify-center mesh-bg text-blue-600 font-bold text-xl animate-pulse">Connecting to Ward Database...</div>;
  }

  if (!appUser) {
    return <LoginScreen onLogin={setAppUser} />;
  }

  return (
    <MainLayout 
      firebaseUser={firebaseUser} 
      currentUser={appUser} 
      onLogout={() => setAppUser(null)} 
    />
  );
}

// --- LOGIN SCREEN WITH USER MANAGEMENT ---
function LoginScreen({ onLogin }) {
  const [name, setName] = useState("");
  const [users, setUsers] = useState([]);
  const [isManaging, setIsManaging] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(getColl('wardUsers'), (snap) => {
      const fetchedUsers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      fetchedUsers.sort((a, b) => a.name.localeCompare(b.name));
      setUsers(fetchedUsers);
    });
    return () => unsub();
  }, []);

  const handleAdhocLogin = (e) => {
    e.preventDefault();
    if (name.trim()) onLogin(name.trim());
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (newName.trim()) {
       await addDoc(getColl('wardUsers'), { name: newName.trim(), createdAt: Date.now() });
       setNewName("");
    }
  };

  const handleDeleteUser = async (id) => {
     await deleteDoc(doc(getColl('wardUsers'), id));
     setConfirmDeleteId(null);
  };

  const handleSaveEdit = async (id) => {
     if (editName.trim()) {
        await updateDoc(doc(getColl('wardUsers'), id), { name: editName.trim() });
        setEditingId(null);
        setEditName("");
     }
  };

  return (
    <div className="min-h-screen mesh-bg flex items-center justify-center p-4 font-sans">
      <div className="bg-white/90 backdrop-blur-lg border border-white p-8 md:p-10 rounded-[2.5rem] w-full max-w-md text-center shadow-2xl relative overflow-hidden transition-all duration-300">
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 w-20 h-20 md:w-24 md:h-24 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg transform rotate-3">
          <Activity className="w-10 h-10 md:w-12 md:h-12 text-white transform -rotate-3" />
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-gray-800 mb-2 tracking-tight">IPD3 dead & palliative care</h1>
        <p className="text-gray-600 mb-6 font-medium text-sm md:text-base">ระบบ Med Sheet ออนไลน์ (Real-time)</p>

        {!isManaging ? (
           <div className="animate-in fade-in slide-in-from-left-4 duration-300">
              <div className="text-left mb-3 font-black text-gray-700 text-sm ml-1 flex items-center justify-between">
                 <span>เลือกชื่อเพื่อเข้าสู่ระบบ</span>
              </div>
              
              {users.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3 max-h-[220px] overflow-y-auto mb-5 custom-scrollbar pr-1">
                    {users.map(u => (
                        <button key={u.id} onClick={() => onLogin(u.name)} className="bg-gray-50 border border-gray-200 p-3 rounded-2xl hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all font-bold text-gray-700 text-left flex items-center gap-2 shadow-sm group">
                          <div className="bg-blue-100 p-1.5 rounded-full group-hover:bg-blue-200 transition-colors"><User size={16} className="text-blue-600" /></div>
                          <span className="truncate text-sm">{u.name}</span>
                        </button>
                    ))}
                  </div>
              ) : (
                  <div className="bg-gray-50 text-gray-400 p-6 rounded-2xl border border-dashed border-gray-300 mb-5 text-sm font-bold">
                      ยังไม่มีรายชื่อในระบบ
                  </div>
              )}

              <form onSubmit={handleAdhocLogin} className="flex gap-2 pt-5 border-t border-gray-200 relative">
                 <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-white px-3 text-xs font-black text-gray-400">หรือพิมพ์ชื่อ</div>
                 <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="ระบุชื่อชั่วคราว..."
                    className="flex-1 bg-gray-50 border border-gray-200 px-4 py-3 rounded-2xl outline-none text-sm md:text-base transition-all font-bold focus:ring-2 focus:ring-blue-500 text-gray-800"
                 />
                 <button type="submit" className="bg-gray-800 hover:bg-gray-900 text-white font-bold px-5 py-3 rounded-2xl transition-all shadow-md active:scale-95 text-sm md:text-base">
                    เข้าสู่ระบบ
                 </button>
              </form>

              <button onClick={() => setIsManaging(true)} className="mt-5 w-full text-sm text-blue-700 font-bold py-3.5 bg-blue-50/50 hover:bg-blue-100 rounded-2xl transition-colors flex justify-center items-center gap-2 border border-blue-100">
                 <Users size={18}/> จัดการรายชื่อประจำวอร์ด
              </button>
           </div>
        ) : (
           <div className="animate-in fade-in slide-in-from-right-4 duration-300 text-left">
              <div className="flex items-center gap-3 mb-5 border-b border-gray-200 pb-3">
                 <div className="bg-purple-100 p-2 rounded-xl text-purple-600"><Users size={20}/></div>
                 <h3 className="font-black text-gray-800 text-lg">จัดการรายชื่อผู้ใช้งาน</h3>
              </div>
              
              <form onSubmit={handleAddUser} className="flex gap-2 mb-5">
                 <input 
                    value={newName} 
                    onChange={e=>setNewName(e.target.value)} 
                    placeholder="เพิ่มชื่อใหม่..." 
                    className="flex-1 bg-gray-50 border border-gray-200 px-4 py-2.5 rounded-xl outline-none text-sm transition-all font-bold focus:ring-2 focus:ring-purple-500 text-gray-800" 
                    required 
                 />
                 <button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-4 py-2.5 rounded-xl transition-all shadow-md active:scale-95 text-sm flex items-center gap-1">
                    <Plus size={16}/> เพิ่ม
                 </button>
              </form>

              <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                 {users.length === 0 && <div className="text-center py-6 text-gray-400 font-bold text-sm bg-gray-50 rounded-xl">ไม่มีข้อมูลผู้ใช้งาน</div>}
                 {users.map(u => (
                    <div key={u.id} className="flex justify-between items-center bg-gray-50 hover:bg-gray-100 p-2.5 rounded-xl border border-gray-200 transition-colors">
                       {editingId === u.id ? (
                          <div className="flex flex-1 gap-2 items-center animate-in fade-in">
                             <input 
                               value={editName} 
                               onChange={e=>setEditName(e.target.value)} 
                               className="flex-1 px-3 py-1.5 rounded-lg border border-gray-300 font-bold text-sm outline-none focus:border-purple-500" 
                               autoFocus
                             />
                             <button onClick={()=>handleSaveEdit(u.id)} className="text-white bg-green-500 hover:bg-green-600 p-1.5 rounded-lg shadow-sm"><CheckCircle size={16}/></button>
                             <button onClick={()=>setEditingId(null)} className="text-gray-500 bg-gray-200 hover:bg-gray-300 p-1.5 rounded-lg"><XCircle size={16}/></button>
                          </div>
                       ) : confirmDeleteId === u.id ? (
                          <div className="flex flex-1 items-center justify-between animate-in fade-in bg-red-50 p-1 -m-1 rounded-lg">
                             <span className="text-sm font-black text-red-600 pl-2">ยืนยันลบ?</span>
                             <div className="flex gap-2">
                                <button onClick={()=>handleDeleteUser(u.id)} className="text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm">ลบเลย</button>
                                <button onClick={()=>setConfirmDeleteId(null)} className="text-gray-600 bg-white border border-gray-300 hover:bg-gray-50 px-3 py-1.5 rounded-lg text-xs font-bold">ยกเลิก</button>
                             </div>
                          </div>
                       ) : (
                          <>
                             <span className="font-bold text-gray-700 truncate flex-1 text-sm pl-1">{u.name}</span>
                             <div className="flex gap-1">
                                <button onClick={()=>{setEditingId(u.id); setEditName(u.name);}} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"><Pencil size={16}/></button>
                                <button onClick={()=>setConfirmDeleteId(u.id)} className="p-1.5 text-red-500 hover:bg-red-100 rounded-lg transition-colors"><Trash2 size={16}/></button>
                             </div>
                          </>
                       )}
                    </div>
                 ))}
              </div>
              
              <button onClick={() => setIsManaging(false)} className="mt-5 w-full bg-gray-100 border border-gray-200 text-gray-700 font-black py-3 rounded-2xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-2">
                 <ChevronLeft size={18}/> กลับไปหน้าล็อกอิน
              </button>
           </div>
        )}
      </div>
    </div>
  );
}

// --- MAIN LAYOUT & LOGIC ---
function MainLayout({ firebaseUser, currentUser, onLogout }) {
  const [patients, setPatients] = useState([]);
  const [meds, setMeds] = useState([]);
  const [logs, setLogs] = useState([]); 
  
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [showSidebar, setShowSidebar] = useState(false); 
  const [sidebarTab, setSidebarTab] = useState('admitted'); 
  const [initialBedForNew, setInitialBedForNew] = useState('');

  const [confirmConfig, setConfirmConfig] = useState(null);
  const [alertMessage, setAlertMessage] = useState("");

  const showConfirm = (message, onConfirm) => {
    setConfirmConfig({ message, onConfirm });
  };
  const showAlert = (message) => {
    setAlertMessage(message);
  };

  useEffect(() => {
    if(alertMessage) {
        const timer = setTimeout(() => setAlertMessage(""), 3000);
        return () => clearTimeout(timer);
    }
  }, [alertMessage]);

  useEffect(() => {
    if (!firebaseUser) return;

    const unsubPatients = onSnapshot(getColl('patients'), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setPatients(data);
    });
    const unsubMeds = onSnapshot(getColl('meds'), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setMeds(data);
    });
    const unsubLogs = onSnapshot(getColl('logs'), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setLogs(data);
    });

    if (window.innerWidth >= 768) {
        setShowSidebar(true);
    }

    return () => {
      unsubPatients();
      unsubMeds();
      unsubLogs();
    };
  }, [firebaseUser]);

  const selectedPatient = useMemo(() => 
    patients.find(p => p.id === selectedPatientId), 
    [patients, selectedPatientId]
  );

  const activePatients = useMemo(() => 
    patients.filter(p => p.status === 'admitted').sort((a, b) => a.bed.localeCompare(b.bed)), 
    [patients]
  );
  
  const dischargedPatients = useMemo(() => 
    patients.filter(p => p.status === 'discharged').sort((a, b) => (b.dischargeDate || '').localeCompare(a.dischargeDate || '')), 
    [patients]
  );

  const handleSeedData = async () => {
    showConfirm("ต้องการโหลดข้อมูลตัวอย่างใช่หรือไม่?", async () => {
      try {
        const batch = writeBatch(db);
        let firstPatientId = null;
        for (let i = 0; i < SEED_PATIENTS.length; i++) {
          const docRef = doc(getColl('patients'));
          batch.set(docRef, SEED_PATIENTS[i]);
          if (i===0) firstPatientId = docRef.id;
        }
        if(firstPatientId) {
          SEED_MEDS.forEach((med, idx) => {
              const docRef = doc(getColl('meds'));
              batch.set(docRef, { ...med, patientId: firstPatientId, createdAt: Date.now() + idx });
          });
        }
        await batch.commit();
        showAlert("โหลดข้อมูลสำเร็จ");
      } catch (e) {
        console.error(e);
        showAlert("เกิดข้อผิดพลาดในการโหลดข้อมูล");
      }
    });
  };

  const handleAddPatient = async (newPatient) => {
    try {
      const docRef = await addDoc(getColl('patients'), { ...newPatient, createdAt: new Date().toISOString() });
      setSidebarTab('admitted');
      setSelectedPatientId(docRef.id); 
      showAlert("เพิ่มผู้ป่วยสำเร็จ");
    } catch (error) {
      console.error("Error adding patient:", error);
      showAlert("เกิดข้อผิดพลาดในการเพิ่มผู้ป่วย");
    }
  };

  const handleAddMultiplePatients = async (newPatientsArray) => {
    if (newPatientsArray.length === 0) return;
    try {
      const batch = writeBatch(db);
      newPatientsArray.forEach((pat) => {
          const docRef = doc(getColl('patients'));
          batch.set(docRef, { ...pat, createdAt: new Date().toISOString() });
      });
      await batch.commit();
      setSidebarTab('admitted');
      setSelectedPatientId(null);
      showAlert(`เพิ่มผู้ป่วยใหม่ ${newPatientsArray.length} รายสำเร็จ`);
    } catch (error) {
      console.error("Error adding multiple patients:", error);
      showAlert("เกิดข้อผิดพลาดในการเพิ่มผู้ป่วย");
    }
  };

  const handleUpdatePatient = async (patientId, updatedData) => {
    try {
      await updateDoc(doc(getColl('patients'), patientId), updatedData);
      if (updatedData.status === 'discharged') {
          setSidebarTab('discharged');
      } else if (updatedData.status === 'admitted') {
          setSidebarTab('admitted');
      }
      showAlert("บันทึกข้อมูลสำเร็จ");
    } catch (error) {
      console.error("Error updating patient:", error);
      showAlert("เกิดข้อผิดพลาดในการแก้ไขข้อมูล");
    }
  };

  const handleDischarge = (patientId) => {
    showConfirm("ยืนยันจำหน่ายผู้ป่วยรายนี้?", async () => {
      const today = new Date().toLocaleDateString('th-TH');
      try {
        await updateDoc(doc(getColl('patients'), patientId), { 
          status: 'discharged', 
          dischargeDate: today 
        });
        setSidebarTab('discharged'); 
        showAlert("จำหน่ายผู้ป่วยสำเร็จ");
      } catch (error) {
        console.error("Error discharging patient:", error);
        showAlert("เกิดข้อผิดพลาดในการจำหน่ายผู้ป่วย");
      }
    });
  };

  const handleUndoDischarge = (patientId) => {
     showConfirm("ยืนยันการยกเลิกจำหน่าย?\nรายชื่อจะกลับมาที่ 'ผู้ป่วยปัจจุบัน'", async () => {
      try {
        await updateDoc(doc(getColl('patients'), patientId), { 
          status: 'admitted', 
          dischargeDate: null 
        });
        setSidebarTab('admitted'); 
        showAlert("ยกเลิกจำหน่ายผู้ป่วยสำเร็จ");
      } catch (error) {
        console.error("Error undoing discharge:", error);
      }
     });
  };

  const handleDeletePatient = (patientId) => {
    showConfirm("คำเตือน: ยืนยันการลบรายชื่อผู้ป่วยนี้อย่างถาวร?\n(ข้อมูลยาและการบันทึกทั้งหมดของรายนี้จะถูกลบทิ้งด้วย)", async () => {
      try {
        const batch = writeBatch(db);
        
        meds.filter(m => m.patientId === patientId).forEach(m => {
          batch.delete(doc(getColl('meds'), m.id));
        });
        
        logs.filter(l => l.patientId === patientId).forEach(l => {
          batch.delete(doc(getColl('logs'), l.id));
        });
        
        batch.delete(doc(getColl('patients'), patientId));

        await batch.commit();

        setSelectedPatientId(null);
        setSidebarTab('admitted');
        showAlert("ลบข้อมูลผู้ป่วยและข้อมูลที่เกี่ยวข้องสำเร็จ");
      } catch (error) {
        console.error("Error deleting patient:", error);
        showAlert("เกิดข้อผิดพลาดในการลบข้อมูล");
      }
    });
  };

  const handleAddMed = async (medData) => { 
    try {
      await addDoc(getColl('meds'), { ...medData, createdAt: Date.now() }); 
      showAlert("เพิ่มสำเร็จ");
    } catch(e) {
      showAlert("ข้อผิดพลาดในการเพิ่ม");
    }
  };

  const handleAddMultipleMeds = async (medsArray) => {
    if (medsArray.length === 0) return;
    try {
      const batch = writeBatch(db);
      const baseTime = Date.now();
      medsArray.forEach((med, idx) => {
          const docRef = doc(getColl('meds'));
          batch.set(docRef, { ...med, createdAt: baseTime + idx });
      });
      await batch.commit();
      showAlert(`เพิ่ม ${medsArray.length} รายการสำเร็จ`);
    } catch(e) {
      console.error(e);
      showAlert("เกิดข้อผิดพลาดในการเพิ่มหลายรายการ");
    }
  };

  const handleSaveMedcardFull = async (patientId, newMedcards) => {
      try {
          const batch = writeBatch(db);
          const oldMeds = meds.filter(m => m.patientId === patientId && m.type === 'medcard');
          oldMeds.forEach(m => {
              batch.delete(doc(getColl('meds'), m.id));
          });

          const baseTime = Date.now();
          newMedcards.forEach((med, idx) => {
              const docRef = doc(getColl('meds'));
              batch.set(docRef, { ...med, createdAt: baseTime + idx });
          });

          await batch.commit();
          showAlert("บันทึก MEDcard สำเร็จ");
      } catch(e) {
          console.error(e);
          showAlert("เกิดข้อผิดพลาดในการบันทึก MEDcard");
      }
  };

  const handleUpdateMed = async (medId, updateData) => { 
    try {
      await updateDoc(doc(getColl('meds'), medId), updateData); 
      showAlert("แก้ไขสำเร็จ");
    } catch(e) {
      showAlert("ข้อผิดพลาดในการแก้ไข");
    }
  };

  const handleDeleteMed = async (medId) => {
    try {
      await deleteDoc(doc(getColl('meds'), medId));
      showAlert("ลบรายการสำเร็จ");
    } catch (error) {
      console.error("Error deleting med:", error);
      showAlert("เกิดข้อผิดพลาดในการลบรายการ");
    }
  };

  const handleToggleIVF = async (medId, currentIVFStatus) => {
    try {
      await updateDoc(doc(getColl('meds'), medId), { isIVF: !currentIVFStatus });
      showAlert(`อัปเดตสถานะ IVF สำเร็จ`);
    } catch (e) {
      console.error(e);
      showAlert("เกิดข้อผิดพลาดในการอัปเดต IVF");
    }
  };

  const handleToggleHAD = async (medId, currentHADStatus) => {
    try {
      await updateDoc(doc(getColl('meds'), medId), { isHAD: !currentHADStatus });
      showAlert(`อัปเดตสถานะ HAD สำเร็จ`);
    } catch (e) {
      console.error(e);
      showAlert("เกิดข้อผิดพลาดในการอัปเดต HAD");
    }
  };

  const handleUndoStopOrder = (medId) => {
    showConfirm("ยืนยันการยกเลิก OFF (นำกลับมาใช้ต่อ)?", async () => {
        try {
            await updateDoc(doc(getColl('meds'), medId), { 
              status: 'active', 
              offBy: null, 
              offAt: null 
            });
            showAlert("ยกเลิก OFF สำเร็จ นำกลับมาใช้งาน");
        } catch (error) {
            console.error("Error undoing stop med:", error);
            showAlert("เกิดข้อผิดพลาด กรุณาลองใหม่");
        }
    });
  };
  
  const handleStopOrder = (medId) => {
    showConfirm("ยืนยันการ Stop Order (หยุดรายการนี้ถาวร)?", async () => {
        try {
            await updateDoc(doc(getColl('meds'), medId), { 
              status: 'off', 
              offBy: currentUser, 
              offAt: new Date().toLocaleString('th-TH') 
            });
            showAlert("Stop Order สำเร็จ");
        } catch (error) {
            console.error("Error stopping med:", error);
            showAlert("เกิดข้อผิดพลาดในการ Stop Order กรุณาลองใหม่");
        }
    });
  };

  const handleLogAction = async (action, data) => {
    try {
        if (action === 'add') await addDoc(getColl('logs'), data);
        else if (action === 'update') await updateDoc(doc(getColl('logs'), data.id), data.fields);
        else if (action === 'delete') await deleteDoc(doc(getColl('logs'), data.id));
    } catch (error) {
        console.error("Error with log action:", error);
    }
  };

  return (
    <div className="flex h-screen mesh-bg overflow-hidden font-sans print-root print:bg-white print:bg-none relative">
      
      {alertMessage && (
          <div className="fixed top-6 right-6 bg-white text-gray-800 px-6 py-4 rounded-2xl shadow-2xl z-[100] animate-in slide-in-from-top-4 fade-in duration-300 flex items-center gap-3 print:hidden border-l-4 border-l-green-500">
              <div className="bg-green-100 p-1.5 rounded-full"><CheckCircle size={20} className="text-green-600"/></div>
              <span className="font-bold text-lg">{alertMessage}</span>
              <button onClick={() => setAlertMessage("")} className="text-gray-400 hover:text-gray-800 ml-2 transition-colors"><XCircle size={18}/></button>
          </div>
      )}

      {confirmConfig && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] px-4 print:hidden">
             <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200 shadow-2xl">
                <div className="p-8 border-b border-gray-100">
                  <div className="flex items-center gap-3 text-red-600 mb-4">
                    <div className="bg-red-100 p-2 rounded-xl"><AlertTriangle size={24} /></div>
                    <h3 className="text-xl font-black text-gray-800">ยืนยันดำเนินการ</h3>
                  </div>
                  <p className="text-gray-700 whitespace-pre-wrap font-medium text-lg leading-relaxed">{confirmConfig.message}</p>
                </div>
                <div className="bg-gray-50 p-4 flex justify-end gap-3">
                  <button onClick={() => setConfirmConfig(null)} className="px-5 py-2.5 bg-white border border-gray-300 rounded-xl text-gray-700 font-bold hover:bg-gray-100 shadow-sm transition active:scale-95">ยกเลิก</button>
                  <button onClick={() => { confirmConfig.onConfirm(); setConfirmConfig(null); }} className="px-5 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-bold hover:from-red-600 hover:to-red-700 shadow-lg flex items-center gap-2 transition active:scale-95">
                     <CheckCircle size={18}/> ยืนยัน
                  </button>
                </div>
             </div>
          </div>
      )}

      <aside 
        className={`
          ${showSidebar ? 'w-80 flex' : 'w-0 hidden md:flex'} 
          bg-white/80 backdrop-blur-xl flex-col transition-all duration-300 z-50 print:hidden absolute top-0 left-0 h-full md:relative border-r border-white/60 shadow-[4px_0_24px_rgba(0,0,0,0.05)]
        `}
      >
        <div className="p-5 bg-white/50 border-b border-gray-200 flex justify-between items-center flex-none">
          <div>
            <h2 className="font-black text-xl text-gray-800 flex items-center gap-2">
               <div className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white p-1.5 rounded-lg shadow-sm"><BedDouble size={20}/></div>
               IPD3 dead & palliative care
            </h2>
            <div className="text-xs text-gray-600 mt-1.5 flex items-center gap-1.5 font-bold bg-white px-2 py-1 rounded-md inline-flex border border-gray-200 shadow-sm">
              <User size={12} className="text-blue-600"/> {currentUser}
            </div>
          </div>
          <button onClick={() => window.innerWidth < 768 ? setShowSidebar(false) : onLogout()} className="p-2 bg-white hover:bg-gray-50 text-gray-600 rounded-full transition border border-gray-200 shadow-sm" title={window.innerWidth < 768 ? "ปิดเมนู" : "ออกจากระบบ"}>
            {window.innerWidth < 768 ? <XCircle size={18}/> : <LogOut size={18} />}
          </button>
        </div>

        <div className="flex border-b border-gray-200 flex-none bg-gray-50 p-2 gap-1">
          <button 
            onClick={() => { setSidebarTab('admitted'); setSelectedPatientId(null); if(window.innerWidth < 768) setShowSidebar(false); }}
            className={`flex-1 py-2.5 text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all rounded-xl ${sidebarTab === 'admitted' ? 'bg-white shadow-sm text-blue-600 border border-gray-200' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            <Activity size={18}/> ปัจจุบัน
          </button>
          <button 
            onClick={() => { setSidebarTab('actionflow'); setSelectedPatientId(null); if(window.innerWidth < 768) setShowSidebar(false); }}
            className={`flex-1 py-2.5 text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all rounded-xl ${sidebarTab === 'actionflow' ? 'bg-white shadow-sm text-purple-600 border border-gray-200' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            <ClipboardList size={18}/> ใบงาน
          </button>
          <button 
            onClick={() => { setSidebarTab('discharged'); setSelectedPatientId(null); if(window.innerWidth < 768) setShowSidebar(false); }}
            className={`flex-1 py-2.5 text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all rounded-xl ${sidebarTab === 'discharged' ? 'bg-white shadow-sm text-gray-800 border border-gray-200' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            <Archive size={18}/> จำหน่าย
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-3 pb-24 space-y-2 no-scrollbar bg-white/50">
          {sidebarTab === 'admitted' && (
            <div className="hidden md:block">
               {activePatients.length === 0 && (
                 <div className="text-center text-gray-500 py-10 text-sm flex flex-col items-center bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                    <Database size={32} className="text-gray-400 mb-3 opacity-50"/>
                    <p className="font-bold">ไม่มีผู้ป่วยในระบบ</p>
                    <button onClick={handleSeedData} className="mt-4 px-4 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-blue-600 rounded-xl font-bold text-xs shadow-sm transition flex items-center gap-2">
                         โหลดข้อมูลตัวอย่าง
                    </button>
                 </div>
               )}
               {activePatients.map(p => (
                <button
                  key={p.id}
                  onClick={() => { setSelectedPatientId(p.id); if(window.innerWidth < 768) setShowSidebar(false); }}
                  className={`w-full text-left p-3 rounded-2xl transition-all flex items-center gap-3 relative group border
                    ${selectedPatientId === p.id 
                      ? 'bg-white border-blue-400 shadow-md ring-2 ring-blue-500/20' 
                      : 'bg-white/80 border-gray-200 hover:bg-white hover:shadow-sm'}
                  `}
                >
                  <div className={`
                    w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg shrink-0 transition-colors shadow-sm
                    ${selectedPatientId === p.id ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white' : 'bg-gray-100 text-gray-600 group-hover:text-blue-600'}
                  `}>
                    {p.bed}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-gray-800 truncate text-[15px]">{p.name}</div>
                    <div className="text-xs text-gray-500 font-medium truncate mt-0.5">HN: {padHN(p.hn)}</div>
                  </div>
                  <div className="absolute right-3 top-3 w-2.5 h-2.5 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)] animate-pulse"></div>
                </button>
              ))}
              <button 
                onClick={() => { setInitialBedForNew(''); setSelectedPatientId('new'); }} 
                className="w-full mt-4 py-3 border-2 border-dashed border-blue-300 bg-blue-50/50 text-blue-600 rounded-2xl hover:border-blue-500 hover:bg-blue-50 flex items-center justify-center gap-2 text-sm font-bold transition shadow-sm"
              >
                <UserPlus size={18} /> รับผู้ป่วยใหม่
              </button>
            </div>
          )}
          
          {sidebarTab === 'admitted' && (
             <div className="md:hidden text-center mt-10 text-gray-500 font-bold p-6 bg-white rounded-2xl border border-gray-200 shadow-sm">
                 <p>กรุณาเลือกผู้ป่วยจาก<br/>แถบด้านบน (Top Bar)</p>
             </div>
          )}

          {sidebarTab === 'actionflow' && (
             <div className="text-center p-4">
                <div className="bg-white border border-purple-100 shadow-sm text-purple-800 p-6 rounded-3xl mb-4 text-center">
                  <div className="bg-purple-100/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3"><ClipboardList size={28} className="text-purple-600"/></div>
                  <h3 className="font-black text-lg">เมนูใบงานประจำเวร</h3>
                  <p className="text-sm mt-2 text-purple-600/80 font-medium">ดูและจัดการ Action Flow ที่หน้าจอด้านขวา</p>
                </div>
                <button 
                    onClick={() => { setShowSidebar(false); }}
                    className="w-full py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl font-bold shadow-md hover:shadow-lg md:hidden active:scale-95 transition"
                >
                    เปิดดูใบงาน
                </button>
             </div>
          )}

          {sidebarTab === 'discharged' && (
            <>
               {dischargedPatients.length === 0 && <div className="text-center text-gray-500 py-8 text-sm bg-white border border-gray-200 rounded-2xl p-4 font-bold shadow-sm">ไม่มีประวัติจำหน่าย</div>}
               {dischargedPatients.map(p => (
                <button
                  key={p.id}
                  onClick={() => { setSelectedPatientId(p.id); if(window.innerWidth < 768) setShowSidebar(false); }}
                  className={`w-full text-left p-3 rounded-2xl border flex items-center gap-3 transition-all relative
                    ${selectedPatientId === p.id ? 'bg-gray-800 border-gray-700 shadow-md' : 'bg-white border-gray-200 hover:bg-gray-50 shadow-sm'}
                  `}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black shrink-0 shadow-sm ${selectedPatientId === p.id ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-600'}`}>
                    D/C
                  </div>
                  <div className="min-w-0">
                    <div className={`font-bold truncate text-sm ${selectedPatientId === p.id ? 'text-white' : 'text-gray-700'}`}>{p.name}</div>
                    <div className={`text-xs font-medium truncate mt-0.5 ${selectedPatientId === p.id ? 'text-gray-300' : 'text-gray-500'}`}>จำหน่าย: {p.dischargeDate || '-'}</div>
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden relative w-full bg-transparent print-container">
        
        <div className="md:hidden bg-white shadow-sm border-b border-gray-200 p-2 flex items-center z-30 sticky top-0">
           <button 
             onClick={() => setShowSidebar(!showSidebar)}
             className="p-2 mr-2 bg-gray-100 rounded-lg text-gray-700 shadow-sm"
           >
             <Menu size={24} />
           </button>
           
           {sidebarTab === 'admitted' && (
               <div className="flex flex-1 overflow-x-auto gap-2 no-scrollbar scroll-smooth">
                   {activePatients.map(p => (
                       <button
                           key={p.id}
                           onClick={() => setSelectedPatientId(p.id)}
                           className={`px-4 py-2 rounded-xl font-black whitespace-nowrap border transition-all ${selectedPatientId === p.id ? 'bg-blue-600 text-white border-blue-700 shadow-md' : 'bg-gray-50 text-gray-600 border-gray-200'}`}
                       >
                           {p.bed}
                       </button>
                   ))}
                   <button onClick={() => { setInitialBedForNew(''); setSelectedPatientId('new'); }} className="px-4 py-2 rounded-xl font-bold whitespace-nowrap border border-dashed border-blue-300 text-blue-600 bg-blue-50 flex items-center gap-1">
                       <Plus size={16}/> รับใหม่
                   </button>
               </div>
           )}
           {sidebarTab !== 'admitted' && (
               <div className="font-black text-gray-800 text-lg flex-1 text-center">
                   {sidebarTab === 'actionflow' ? 'ใบงานประจำเวร' : 'ประวัติจำหน่าย'}
               </div>
           )}
        </div>

        {sidebarTab === 'actionflow' ? (
           <ActionFlowView patients={activePatients} meds={meds} logs={logs} showAlert={showAlert} />
        ) : selectedPatientId === 'new' ? (
           <NewPatientForm initialBed={initialBedForNew} onAdd={handleAddPatient} onAddMultiple={handleAddMultiplePatients} activePatients={activePatients} onCancel={() => setSelectedPatientId(null)} showAlert={showAlert} />
        ) : selectedPatient ? (
           <MedSheet 
             currentUser={currentUser}
             patient={selectedPatient}
             meds={meds.filter(m => m.patientId === selectedPatient.id)}
             logs={logs.filter(l => l.patientId === selectedPatient.id)}
             onAddMed={handleAddMed}
             onAddMultipleMeds={handleAddMultipleMeds}
             onSaveMedcardFull={handleSaveMedcardFull}
             onUpdateMed={handleUpdateMed}
             onDeleteMed={handleDeleteMed}
             onStopOrder={handleStopOrder}
             onUndoStopOrder={handleUndoStopOrder}
             onToggleIVF={handleToggleIVF}
             onToggleHAD={handleToggleHAD}
             onLogAction={handleLogAction}
             onDischarge={() => handleDischarge(selectedPatient.id)}
             onUndoDischarge={() => handleUndoDischarge(selectedPatient.id)}
             onUpdatePatient={handleUpdatePatient}
             onDeletePatient={() => handleDeletePatient(selectedPatient.id)}
             showConfirm={showConfirm}
             showAlert={showAlert}
           />
        ) : sidebarTab === 'admitted' ? (
           <BedMapView 
             patients={activePatients} 
             meds={meds}
             logs={logs}
             onSelectPatient={(id) => { setSelectedPatientId(id); if(window.innerWidth < 768) setShowSidebar(false); }}
             onAdmitToBed={(bed) => { setInitialBedForNew(bed); setSelectedPatientId('new'); }}
           />
        ) : sidebarTab === 'discharged' && dischargedPatients.length === 0 ? (
           <div className="flex-1 flex flex-col items-center justify-center text-gray-500 bg-transparent">
             <div className="bg-white shadow-sm border border-gray-200 p-12 rounded-full mb-6"><Archive size={64} className="text-gray-300" /></div>
             <p className="text-xl font-black text-gray-700">ไม่มีประวัติผู้ป่วยจำหน่าย</p>
           </div>
        ) : (
           <div className="flex-1 flex flex-col items-center justify-center text-gray-600 bg-transparent p-4 text-center">
             <div className="bg-white shadow-lg p-10 rounded-full mb-8 border border-blue-100 transform hover:scale-105 transition duration-500">
                <Activity size={80} className="text-blue-500 drop-shadow-sm" />
             </div>
             <p className="text-2xl font-black text-gray-800 mb-2 tracking-tight">เลือกผู้ป่วยเพื่อเริ่มต้น</p>
             <p className="text-base text-gray-600 font-medium max-w-sm">เลือกรายชื่อจากเมนูด้านซ้ายหรือแถบด้านบนเพื่อดู Med Sheet หรือจัดการข้อมูล</p>
             <div className="mt-8 flex items-center gap-2 text-sm text-teal-700 bg-white border border-teal-100 px-4 py-2 rounded-full font-bold shadow-sm">
                <Cloud size={16} className="text-teal-500"/> ซิงค์ข้อมูลอัตโนมัติ (Real-time)
             </div>
           </div>
        )}
      </main>

      <datalist id="common-med-times">
          <option value="6, 12, 18, 24" />
          <option value="8, 12, 16, 20" />
          <option value="9, 13, 17, 21" />
          <option value="8, 16, 24" />
          <option value="8, 14, 20" />
          <option value="8, 20" />
          <option value="9, 21" />
          <option value="ac" />
          <option value="pc" />
          <option value="hs" />
          <option value="prn" />
      </datalist>
    </div>
  );
}

// ============================================================
// --- ACTION FLOW VIEW ---
// ============================================================
function ActionFlowView({ patients, meds, logs, showAlert }) {
    const [shift, setShift] = useState('morning'); 

    const SHIFTS = {
        'handover': { label: 'ใบรับเวร (Handover)', hours: [], color: 'text-teal-700' },
        'night': { label: 'เวรดึก (00.00 - 08.00)', hours: [0, 1, 2, 3, 4, 5, 6, 7, 8], color: 'text-indigo-700' },
        'morning': { label: 'เวรเช้า (08.00 - 16.00)', hours: [8, 9, 10, 11, 12, 13, 14, 15, 16], color: 'text-orange-600' },
        'afternoon': { label: 'เวรบ่าย (16.00 - 24.00)', hours: [16, 17, 18, 19, 20, 21, 22, 23, 0], color: 'text-blue-600' }
    };

    const targetHours = SHIFTS[shift].hours;
    const isHandover = shift === 'handover';

    const handlePrintPDF = async () => {
        if (!window.html2pdf) {
            showAlert("กำลังโหลดระบบสร้าง PDF กรุณารอสักครู่...");
            return;
        }
        showAlert("กำลังเตรียมเอกสาร... กรุณารอสักครู่ (อาจใช้เวลา 2-3 วินาที)");
        
        const element = document.getElementById('print-actionflow-container');
        const origStyle = element.style.cssText;
        
        const isPortrait = isHandover;
        const width = isPortrait ? '800px' : '1123px';
        
        element.style.cssText = `display: block; width: ${width}; background: white; font-family: 'Sarabun', sans-serif; padding: 20px;`;
        
        const opt = {
            margin: [10, 10, 10, 10],
            filename: `${isHandover ? 'Handover' : 'ActionFlow'}_${shift}_${new Date().getTime()}.pdf`,
            image: { type: 'jpeg', quality: 1.0 },
            html2canvas: { scale: 2, useCORS: true, logging: false },
            jsPDF: { unit: 'mm', format: 'a4', orientation: isPortrait ? 'portrait' : 'landscape' },
            pagebreak: { mode: ['css', 'legacy'] }
        };
        
        try {
            await new Promise(r => setTimeout(r, 800));
            await window.html2pdf().set(opt).from(element).save();
            showAlert("สร้างและดาวน์โหลดไฟล์ PDF สำเร็จ! 🎉");
        } catch (err) {
            console.error("PDF Error:", err);
            showAlert("เกิดข้อผิดพลาดในการสร้างไฟล์ PDF: " + err.message);
        } finally {
            element.style.cssText = origStyle;
        }
    };

    return (
        <div className="flex flex-col h-full bg-transparent print-root relative z-10">
            
            {/* --- HIDDEN PRINT CONTAINER --- */}
            <div id="print-actionflow-container" style={{ display: 'none' }}>
                <div style={{ textAlign: 'center', marginBottom: '16px', fontFamily: "'Sarabun', sans-serif" }}>
                    <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{isHandover ? 'ใบรับเวร (Handover)' : 'ใบงานประจำเวร'}</div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{SHIFTS[shift].label}</div>
                    <div style={{ fontSize: '12px', color: '#4b5563' }}>พิมพ์เมื่อ: {new Date().toLocaleString('th-TH')} น.</div>
                </div>

                {isHandover ? (
                    <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid black', fontSize: '13px' }}>
                        <colgroup>
                            <col style={{ width: '22%' }} />
                            <col style={{ width: '18%' }} />
                            <col style={{ width: '42%' }} />
                            <col style={{ width: '18%' }} />
                        </colgroup>
                        <thead>
                            <tr style={{ backgroundColor: '#f3f4f6' }}>
                                <th style={{ border: '1px solid black', padding: '8px', textAlign: 'center' }}>ข้อมูลผู้ป่วย</th>
                                <th colSpan={2} style={{ border: '1px solid black', padding: '8px', textAlign: 'center' }}>รายละเอียดการรักษา / ส่งเวร</th>
                                <th style={{ border: '1px solid black', padding: '8px', textAlign: 'center' }}>NOTE</th>
                            </tr>
                        </thead>
                        {patients.length === 0 ? (
                            <tbody><tr><td colSpan={4} style={{ textAlign: 'center', padding: '20px', border: '1px solid black' }}>ไม่มีผู้ป่วยปัจจุบัน</td></tr></tbody>
                        ) : (
                            patients.map((patient) => {
                                const pMeds = meds.filter(m => m.patientId === patient.id && m.status === 'active');
                                const getMedVal = (keyword) => pMeds.find(m => m.type === 'medcard' && m.name.toLowerCase().includes(keyword.toLowerCase()))?.detail || '';
                                
                                const rec = getMedVal('record');
                                const film = getMedVal('film');
                                const ds = getMedVal('ทำแผล');
                                const consult = getMedVal('consult');
                                const note = getMedVal('หมายเหตุ');
                                const hc2 = getMedVal('h/c day 2');
                                const hc5 = getMedVal('h/c day 5');
                                const combinedHC = [hc2 ? `Day 2: ${hc2}` : null, hc5 ? `Day 5: ${hc5}` : null].filter(Boolean).join(', ');

                                const labItems = pMeds.filter(m => m.type === 'medcard' && (
                                    m.name.toLowerCase().includes('lab') || 
                                    m.name.toLowerCase().includes('hct') ||
                                    m.name.toLowerCase().includes('npo')
                                )).map(m => {
                                    if (m.name.includes(':')) return m.name + (m.detail && m.name !== m.detail ? ` (${m.detail})` : '');
                                    return m.name + (m.detail ? `: ${m.detail}` : '');
                                }).join(' | ');

                                const subTableRows = [
                                    { label: 'Diagnosis', value: patient.diagnosis, isGreen: true },
                                    { label: 'Record', value: rec },
                                    { label: 'LAB / DTX', value: labItems }, 
                                    { label: 'H/C', value: combinedHC },
                                    { label: 'Consult', value: consult },
                                    { label: 'X-ray', value: film },
                                    { label: 'ทำแผล', value: ds },
                                    { label: 'อื่นๆ', value: note },
                                ].filter(row => row.value || row.label === 'Diagnosis');

                                while (subTableRows.length < 4) subTableRows.push({label: '', value: ''});
                                subTableRows.push({label: '', value: ''});
                                subTableRows.push({label: '', value: ''});

                                return (
                                    <tbody key={patient.id} style={{ pageBreakInside: 'avoid' }}>
                                        {subTableRows.map((row, rIdx) => (
                                            <tr key={rIdx}>
                                                {rIdx === 0 && (
                                                    <td rowSpan={subTableRows.length} style={{ border: '1px solid black', padding: '8px', verticalAlign: 'top', textAlign: 'center' }}>
                                                        <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{patient.bed}</div>
                                                        <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>{patient.name}</div>
                                                        <div style={{ fontSize: '12px' }}>HN: {padHN(patient.hn)}</div>
                                                    </td>
                                                )}
                                                <td style={{ border: '1px solid black', padding: '8px', fontWeight: 'bold', verticalAlign: 'top' }}>{row.label}</td>
                                                <td style={{ border: '1px solid black', padding: '8px', verticalAlign: 'top', color: row.isGreen ? '#15803d' : 'black', whiteSpace: 'pre-wrap' }}>{row.value}</td>
                                                {rIdx === 0 && (
                                                    <td rowSpan={subTableRows.length} style={{ border: '1px solid black', padding: '8px', verticalAlign: 'top', textAlign: 'center', position: 'relative' }}>
                                                         <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
                                                            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=${padHN(patient.hn)}`} alt="QR Code" style={{ width: '45px', height: '45px', mixBlendMode: 'multiply', border: '1px solid black', padding: '2px' }} />
                                                         </div>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                )
                            })
                        )}
                    </table>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid black', fontSize: '12px' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f3f4f6' }}>
                                <th rowSpan={2} style={{ border: '1px solid black', padding: '8px', textAlign: 'center', width: '40px' }}>#</th>
                                <th rowSpan={2} style={{ border: '1px solid black', padding: '8px', textAlign: 'left', width: '200px' }}>NAME</th>
                                <th rowSpan={2} style={{ border: '1px solid black', padding: '8px', textAlign: 'center', width: '120px' }}>IVF</th>
                                <th colSpan={targetHours.length} style={{ border: '1px solid black', padding: '8px', textAlign: 'center' }}>ACTION / MEDICATION</th>
                            </tr>
                            <tr style={{ backgroundColor: '#f3f4f6' }}>
                                {targetHours.map(h => (
                                    <th key={h} style={{ border: '1px solid black', padding: '8px', textAlign: 'center' }}>
                                        {h === 0 ? '00.00' : `${String(h).padStart(2,'0')}.00`}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {patients.length === 0 ? (
                                 <tr><td colSpan={3 + targetHours.length} style={{ textAlign: 'center', padding: '20px', border: '1px solid black' }}>ไม่มีผู้ป่วยปัจจุบัน</td></tr>
                            ) : (
                                patients.map((patient) => (
                                    <tr key={patient.id} style={{ pageBreakInside: 'avoid' }}>
                                        <td style={{ border: '1px solid black', padding: '8px', textAlign: 'center', fontWeight: 'bold', fontSize: '14px' }}>{patient.bed}</td>
                                        <td style={{ border: '1px solid black', padding: '8px', verticalAlign: 'top' }}>
                                            <div style={{ fontWeight: 'bold' }}>{patient.name}</div>
                                            <div style={{ fontSize: '10px', color: '#4b5563' }}>HN: {padHN(patient.hn)}</div>
                                        </td>
                                        <td style={{ border: '1px solid black', padding: '8px', verticalAlign: 'top' }}>
                                            {meds.filter(m => m.patientId === patient.id && m.isIVF && m.status === 'active').map(ivfMed => (
                                                <div key={ivfMed.id} style={{ marginBottom: '4px', fontSize: '10px', padding: '4px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '4px' }}>
                                                    <strong>{ivfMed.name}</strong>
                                                    {ivfMed.detail && <div>{ivfMed.detail}</div>}
                                                </div>
                                            ))}
                                        </td>
                                        {targetHours.map(h => {
                                            const hourMeds = meds.filter(m => {
                                                if (m.patientId !== patient.id) return false;
                                                if (m.status === 'off') return false;
                                                if (m.type !== 'injection' && m.type !== 'medcard') return false;
                                                let timesArray = [];
                                                if (Array.isArray(m.times)) timesArray = m.times;
                                                else if (typeof m.times === 'string') timesArray = m.times.split(',').map(t => parseInt(t.trim(), 10));
                                                else if (typeof m.times === 'number') timesArray = [m.times];
                                                return timesArray.some(t => {
                                                    let tVal = parseInt(t, 10);
                                                    let hVal = parseInt(h, 10);
                                                    if (isNaN(tVal)) return false;
                                                    if (tVal === 24) tVal = 0;
                                                    if (hVal === 24) hVal = 0;
                                                    return tVal === hVal;
                                                });
                                            });
                                            return (
                                                <td key={h} style={{ border: '1px solid black', padding: '4px', verticalAlign: 'top' }}>
                                                    {hourMeds.length > 0 ? hourMeds.map(med => {
                                                        const isInj = med.type === 'injection';
                                                        return (
                                                            <div key={med.id} style={{ marginBottom: '4px', padding: '4px', fontSize: '10px', backgroundColor: isInj ? '#fff1f2' : '#f0fdf4', border: `1px solid ${isInj ? '#fecdd3' : '#bbf7d0'}`, borderRadius: '4px' }}>
                                                                <div style={{ fontWeight: 'bold' }}>{med.name}</div>
                                                                {med.type !== 'medcard' && (med.detail || med.instruction) && (
                                                                    <div style={{ marginTop: '2px' }}>{med.detail || med.instruction}</div>
                                                                )}
                                                            </div>
                                                        )
                                                    }) : '-'}
                                                </td>
                                            )
                                        })}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* --- VISIBLE UI --- */}
            <div className="p-4 md:p-6 bg-white/60 backdrop-blur-md border-b border-white/60 print:hidden flex-none z-20">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-5">
                    <div className="flex items-center gap-4">
                        <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-3 rounded-2xl text-white shadow-lg shadow-purple-500/30">
                            <ClipboardList size={28} />
                        </div>
                        <div>
                             <h1 className="text-2xl md:text-3xl font-black text-gray-800 tracking-tight">
                                 {isHandover ? 'ใบรับเวร (Handover)' : 'ใบงานประจำเวร'}
                             </h1>
                             <p className="text-gray-600 text-sm font-medium mt-1">
                                 {isHandover ? 'สรุปข้อมูลผู้ป่วยและการรักษาเพื่อส่งเวร' : 'รายการยาฉีด (Injection), น้ำเกลือ (IVF) และการรักษา (MEDcard)'}
                             </p>
                        </div>
                    </div>
                    
                    <button onClick={handlePrintPDF} className="bg-gradient-to-r from-red-500 to-red-600 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-bold hover:from-red-600 hover:to-red-700 transition shadow-lg shadow-red-500/20 active:scale-95">
                        <FileText size={18}/> พิมพ์ / PDF
                    </button>
                </div>

                <div className="flex items-center gap-4 bg-white p-3 rounded-xl border border-gray-200 shadow-sm inline-flex">
                    <label className="font-bold text-gray-800">เลือกเวร:</label>
                    <div className="relative">
                        <select 
                            value={shift}
                            onChange={(e) => setShift(e.target.value)}
                            className={`appearance-none bg-gray-50 border border-gray-300 px-4 py-2 pr-10 rounded-lg font-black focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all min-w-[200px] md:min-w-[250px] ${SHIFTS[shift].color}`}
                        >
                            {Object.entries(SHIFTS).map(([key, val]) => (
                                <option key={key} value={key} className="text-gray-800 font-bold">{val.label}</option>
                            ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-600">
                            <Clock size={18}/>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-4 md:p-6 print:p-0 print:overflow-visible relative">
                <div id="action-flow-capture-area">
                    {isHandover ? (
                        // --- HANDOVER VIEW ---
                        <div className="bg-white w-full rounded-xl border border-slate-300 shadow-md p-4">
                            <table className="w-full table-fixed border-collapse text-black break-words border border-slate-300" style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }}>
                                <colgroup>
                                    <col style={{ width: '22%' }} />
                                    <col style={{ width: '18%' }} />
                                    <col style={{ width: '42%' }} />
                                    <col style={{ width: '18%' }} />
                                </colgroup>
                                <thead className="bg-slate-100 border-b border-slate-300">
                                    <tr>
                                        <th className="border-r border-slate-300 p-3 text-center text-[13px] font-black">ข้อมูลผู้ป่วย</th>
                                        <th className="border-r border-slate-300 p-3 text-center text-[13px] font-black" colSpan={2}>รายละเอียดการรักษา / ส่งเวร</th>
                                        <th className="p-3 text-center text-[13px] font-black">NOTE</th>
                                    </tr>
                                </thead>
                                
                                {patients.length === 0 ? (
                                    <tbody>
                                        <tr><td colSpan={4} className="text-center p-8 text-gray-500 font-bold border-t border-slate-300">ไม่มีผู้ป่วยปัจจุบัน</td></tr>
                                    </tbody>
                                ) : (
                                    patients.map((patient) => {
                                        const pMeds = meds.filter(m => m.patientId === patient.id && m.status === 'active');
                                        const getMedVal = (keyword) => pMeds.find(m => m.type === 'medcard' && m.name.toLowerCase().includes(keyword.toLowerCase()))?.detail || '';
                                        
                                        const rec = getMedVal('record');
                                        const film = getMedVal('film');
                                        const ds = getMedVal('ทำแผล');
                                        const consult = getMedVal('consult');
                                        const note = getMedVal('หมายเหตุ');
                                        const hc2 = getMedVal('h/c day 2');
                                        const hc5 = getMedVal('h/c day 5');
                                        const combinedHC = [hc2 ? `Day 2: ${hc2}` : null, hc5 ? `Day 5: ${hc5}` : null].filter(Boolean).join(', ');

                                        const labItems = pMeds.filter(m => m.type === 'medcard' && (
                                            m.name.toLowerCase().includes('lab') || 
                                            m.name.toLowerCase().includes('hct') ||
                                            m.name.toLowerCase().includes('npo')
                                        )).map(m => {
                                            if (m.name.includes(':')) return m.name + (m.detail && m.name !== m.detail ? ` (${m.detail})` : '');
                                            return m.name + (m.detail ? `: ${m.detail}` : '');
                                        }).join(' | ');

                                        const subTableRows = [
                                            { label: 'Diagnosis', value: patient.diagnosis, isGreen: true },
                                            { label: 'Record', value: rec },
                                            { label: 'LAB / DTX', value: labItems }, 
                                            { label: 'H/C', value: combinedHC },
                                            { label: 'Consult', value: consult },
                                            { label: 'X-ray', value: film },
                                            { label: 'ทำแผล', value: ds },
                                            { label: 'อื่นๆ', value: note },
                                        ].filter(row => row.value || row.label === 'Diagnosis');

                                        while (subTableRows.length < 4) subTableRows.push({label: '', value: ''});
                                        subTableRows.push({label: '', value: ''});
                                        subTableRows.push({label: '', value: ''});

                                        return (
                                            <tbody key={patient.id} className="patient-block bg-white border-t border-slate-300">
                                                {subTableRows.map((row, rIdx) => (
                                                    <tr key={rIdx} className="border-b border-slate-100 last:border-0">
                                                        {rIdx === 0 && (
                                                            <td rowSpan={subTableRows.length} className="border-r border-slate-300 p-3 align-top bg-slate-50/50 text-center">
                                                                <div className="flex flex-col items-center justify-center mt-3">
                                                                    <div className="text-[54px] font-black text-indigo-900 leading-none mb-3 tracking-tighter">{patient.bed}</div>
                                                                    <div className="font-bold text-[14px] text-gray-800 leading-tight px-1 mb-4">{patient.name}</div>
                                                                    <div className="w-[85%] border-t border-gray-300 pt-3 mx-auto">
                                                                        <div className="text-[12px] font-black text-gray-500">HN: {padHN(patient.hn)}</div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        )}
                                                        <td className="border-r border-slate-200 p-2.5 font-black text-gray-700 text-[12px] align-top bg-white">
                                                            {row.label}
                                                        </td>
                                                        <td className={`border-r border-slate-300 p-2.5 font-bold text-[12px] align-top bg-white ${row.isGreen ? 'text-green-700' : 'text-gray-800'} whitespace-pre-wrap`}>
                                                            {row.value}
                                                        </td>
                                                        {rIdx === 0 && (
                                                            <td rowSpan={subTableRows.length} className="p-2 align-top bg-white relative">
                                                            </td>
                                                        )}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        );
                                    })
                                )}
                            </table>
                        </div>
                    ) : (
                        // --- ACTION FLOW VIEW ---
                        <div className="bg-white rounded-xl border border-slate-300 shadow-md">
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', background: 'white', minWidth: 'max-content' }}>
                                    <thead>
                                        <tr>
                                            <th rowSpan={2} style={{ border: '1px solid #cbd5e1', background: '#e2e8f0', padding: '10px', textAlign: 'center', minWidth: '50px', fontWeight: '900', color: '#1e293b', position: 'sticky', top: 0, left: 0, zIndex: 40 }}>#</th>
                                            <th rowSpan={2} style={{ border: '1px solid #cbd5e1', background: '#e2e8f0', padding: '10px', minWidth: '220px', fontWeight: '900', color: '#1e293b', position: 'sticky', top: 0, left: '50px', zIndex: 40 }}>NAME</th>
                                            <th rowSpan={2} style={{ border: '1px solid #cbd5e1', background: '#f1f5f9', padding: '10px', minWidth: '140px', textAlign: 'center', fontWeight: '900', color: '#1e293b', position: 'sticky', top: 0, zIndex: 30 }}>IVF</th>
                                            <th colSpan={targetHours.length} style={{ border: '1px solid #cbd5e1', background: '#1e293b', color: 'white', padding: '10px', textAlign: 'center', fontWeight: '900', letterSpacing: '0.1em', position: 'sticky', top: 0, zIndex: 30 }}>
                                                ACTION / MEDICATION
                                            </th>
                                        </tr>
                                        <tr>
                                            {targetHours.map(h => (
                                                <th key={h} style={{ border: '1px solid #cbd5e1', background: '#f1f5f9', padding: '8px', textAlign: 'center', minWidth: '100px', fontWeight: '900', color: '#1e293b', position: 'sticky', top: '41px', zIndex: 30 }}>
                                                    {h === 0 ? '00.00' : `${String(h).padStart(2,'0')}.00`}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {patients.length === 0 ? (
                                            <tr>
                                                <td colSpan={3 + targetHours.length} style={{ textAlign: 'center', padding: '48px', color: '#64748b', fontWeight: 'bold', border: '1px solid #e2e8f0' }}>
                                                    ไม่มีผู้ป่วยปัจจุบัน
                                                </td>
                                            </tr>
                                        ) : (
                                            patients.map((patient, idx) => (
                                                <tr key={patient.id} style={{ pageBreakInside: 'avoid', breakInside: 'avoid', background: 'white' }}>
                                                    {/* เตียง */}
                                                    <td style={{ border: '1px solid #e2e8f0', background: '#f1f5f9', textAlign: 'center', fontWeight: '900', padding: '10px', fontSize: '16px', color: '#1e293b', position: 'sticky', left: 0, zIndex: 20 }}>
                                                        {patient.bed}
                                                    </td>
                                                    {/* ชื่อ */}
                                                    <td style={{ border: '1px solid #e2e8f0', background: 'white', padding: '10px', verticalAlign: 'top', position: 'sticky', left: '50px', zIndex: 20 }}>
                                                        <div style={{ fontWeight: '900', fontSize: '14px', color: '#1e293b' }}>{patient.name}</div>
                                                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', fontWeight: '600' }}>HN: {padHN(patient.hn)}</div>
                                                    </td>
                                                    {/* IVF */}
                                                    <td style={{ border: '1px solid #e2e8f0', padding: '8px', verticalAlign: 'top', background: 'white' }}>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                            {meds.filter(m => m.patientId === patient.id && m.isIVF && m.status === 'active').map(ivfMed => (
                                                                <div key={ivfMed.id} style={{ fontSize: '11px', fontWeight: '700', color: '#1e3a5f', background: '#eff6ff', padding: '6px 8px', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
                                                                    {ivfMed.name}
                                                                    {ivfMed.detail && <div style={{ color: '#1d4ed8', fontWeight: '500', marginTop: '2px' }}>{ivfMed.detail}</div>}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    {/* เวลา */}
                                                    {targetHours.map(h => {
                                                        const hourMeds = meds.filter(m => {
                                                            if (m.patientId !== patient.id) return false;
                                                            if (m.status === 'off') return false;
                                                            if (m.type !== 'injection' && m.type !== 'medcard') return false;
                                                            let timesArray = [];
                                                            if (Array.isArray(m.times)) timesArray = m.times;
                                                            else if (typeof m.times === 'string') timesArray = m.times.split(',').map(t => parseInt(t.trim(), 10));
                                                            else if (typeof m.times === 'number') timesArray = [m.times];
                                                            return timesArray.some(t => {
                                                                let tVal = parseInt(t, 10);
                                                                let hVal = parseInt(h, 10);
                                                                if (isNaN(tVal)) return false;
                                                                if (tVal === 24) tVal = 0;
                                                                if (hVal === 24) hVal = 0;
                                                                return tVal === hVal;
                                                            });
                                                        });

                                                        return (
                                                            <td key={h} style={{ border: '1px solid #e2e8f0', padding: '6px', verticalAlign: 'top', background: 'white', minWidth: '100px' }}>
                                                                {hourMeds.length > 0 ? (
                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                        {hourMeds.map(med => {
                                                                            const isInj = med.type === 'injection';
                                                                            const boxStyle = isInj
                                                                                ? { background: '#fff1f2', border: '1px solid #fecdd3', color: '#881337' }
                                                                                : { background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#14532d' };
                                                                            return (
                                                                                <div key={med.id} style={{ ...boxStyle, padding: '5px 7px', borderRadius: '6px', fontSize: '11px' }}>
                                                                                    <div style={{ fontWeight: '800', wordBreak: 'break-word', whiteSpace: 'normal' }}>{med.name}</div>
                                                                                    {med.type !== 'medcard' && (med.detail || med.instruction) && (
                                                                                        <div style={{ fontWeight: '500', marginTop: '2px', opacity: 0.9, wordBreak: 'break-word', whiteSpace: 'normal' }}>
                                                                                            {med.detail || med.instruction}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                ) : (
                                                                    <div style={{ color: 'transparent' }}>-</div>
                                                                )}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// --- MED SHEET COMPONENT ---
function MedSheet({ 
  currentUser, patient, meds, logs, onAddMed, onAddMultipleMeds,
  onSaveMedcardFull, onUpdateMed, onDeleteMed, onStopOrder, onUndoStopOrder,
  onToggleIVF, onToggleHAD, onLogAction, onDischarge, onUndoDischarge, onUpdatePatient, onDeletePatient, showConfirm, showAlert
}) {
  const [activeTab, setActiveTab] = useState('oral');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditPatientModal, setShowEditPatientModal] = useState(false);
  const [editingMed, setEditingMed] = useState(null);
  
  const [retroMode, setRetroMode] = useState(false);
  const [retroTime, setRetroTime] = useState("");
  const [retroDate, setRetroDate] = useState(getLocalDateString(new Date()));
  const [showRetroModal, setShowRetroModal] = useState(false);

  const initialBulkData = Array.from({ length: 10 }, () => ({ name: '', times: '' }));
  const [bulkFormData, setBulkFormData] = useState(initialBulkData);
  
  const initialMedcardForm = {
      record: '', dtx: '', dtxTime: '', hct: '', hctTime: '',
      lab1: '', lab1Time: '', lab2: '', lab2Time: '', 
      film: '', wound: '', woundTime: '', consult: '', npo: '',
      medNb1: '', medNb1Time: '', medNb2: '', medNb2Time: '',
      stat1: '', stat2: '', diet: '', flush06: false, flush18: false,
      hc2: '', hc5: '', note: ''
  };
  const [medcardForm, setMedcardForm] = useState(initialMedcardForm);
  
const dateRange = useMemo(() => {
    return generateDynamicDateRange(patient, logs, retroMode ? retroDate : null);
}, [patient, logs, retroMode, retroDate]);

  const sortedMeds = useMemo(() => {
    return meds.filter(m => m.type === activeTab).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  }, [meds, activeTab]);

  const getLogTimeAndDate = (dateKey) => {
      if (retroMode && retroTime && retroDate) {
          return { logTime: retroTime, logDateKey: retroDate };
      }
      return { logTime: formatTime(new Date()), logDateKey: dateKey };
  };

  const handleCellClick = (med, timestamp, dateKey) => {
    if (med.status === 'off') return;
    const existingLog = logs.find(l => l.medId === med.id && l.dateKey === dateKey && l.timestamp === timestamp);
    
    if (existingLog) {
        if (existingLog.status === 'given') {
            onLogAction('update', { id: existingLog.id, fields: { status: 'hold', user: currentUser } });
        } else {
            onLogAction('delete', { id: existingLog.id });
        }
    } else {
        const { logTime, logDateKey } = getLogTimeAndDate(dateKey);
        const now = new Date();
        const selectedDateTime = new Date(`${logDateKey}T${logTime}:00`);
        
        if (selectedDateTime > now) {
            showAlert("ไม่อนุญาตให้ลงชื่อและเวลาล่วงหน้าได้!");
            return;
        }

        onLogAction('add', {
            medId: med.id, patientId: patient.id, timestamp: timestamp, 
            dateKey: dateKey,
            user: currentUser, status: 'given', realTime: logTime 
        });
    }
  };

  const handlePrnAdd = (med, dateKey) => {
      if (med.status === 'off') return;
      const { logTime, logDateKey } = getLogTimeAndDate(dateKey);
      const now = new Date();
      const selectedDateTime = new Date(`${logDateKey}T${logTime}:00`);
      if (selectedDateTime > now) {
          showAlert("ไม่อนุญาตให้ลงชื่อและเวลาล่วงหน้าได้!");
          return;
      }
      onLogAction('add', {
          medId: med.id, patientId: patient.id, timestamp: logTime,
          dateKey: dateKey, user: currentUser, status: 'given', realTime: logTime
      });
  };
  
 const handlePasteToBulk = (e, startIndex, field) => {
      e.preventDefault();
      const pasteData = e.clipboardData.getData('text');
      if (!pasteData) return;

      const lines = pasteData.split(/\r?\n/).map(line => line.trim()).filter(line => line !== '');
      const newData = [...bulkFormData];
      let currentIndex = startIndex;

      for (let i = 0; i < lines.length; i++) {
          if (currentIndex >= 10) break; 

          let currentLine = lines[i];
          if (currentLine.toUpperCase() === '+PLAN') continue;

          if (currentLine.startsWith('-')) {
              currentLine = currentLine.substring(1).trim();
          }

          currentLine = currentLine.replace(/\+Plan/ig, '').trim();

          if (field === 'name' && i + 1 < lines.length && !lines[i + 1].startsWith('-')) {
              let nextLine = lines[i + 1].replace(/\+Plan/ig, '').trim();
              currentLine = `${currentLine} ${nextLine}`;
              i++; 
          }

          if (field === 'name') {
              newData[currentIndex].name = currentLine;
          } else {
              newData[currentIndex].times = currentLine;
          }

          currentIndex++;
      }

      setBulkFormData(newData);
  };

  const handleSaveBulkMeds = (e) => {
    e.preventDefault();
    const validEntries = bulkFormData.filter(item => item.name.trim() !== '');
    if (validEntries.length === 0) { showAlert("กรุณากรอกข้อมูลอย่างน้อย 1 รายการ"); return; }
    const medsToSave = validEntries.map(entry => ({
        patientId: patient.id, barcode: '-', name: entry.name.trim(), detail: '', instruction: '', 
        times: entry.times ? entry.times.split(',').map(t => parseInt(t.trim())).filter(n => !isNaN(n)) : [],
        type: activeTab, status: 'active', isHAD: false
    }));
    const performSave = () => {
        onAddMultipleMeds(medsToSave); setShowAddModal(false); setBulkFormData(initialBulkData); 
    };
    const conflicts = [];
    validEntries.forEach(entry => {
        const conflict = checkAllergyConflict(entry.name, patient.allergies);
        if (conflict) conflicts.push(`- ${entry.name} (แพ้ยากลุ่ม: ${conflict.toUpperCase()})`);
    });
    if (conflicts.length > 0) showConfirm(`⚠️ แจ้งเตือนความปลอดภัยระดับสูง\n\nพบรายการยาที่อาจแพ้:\n${conflicts.join('\n')}\n\nยืนยันเพิ่มรายการ?`, performSave);
    else performSave();
  };

  const openMedcardForm = () => {
      const pMedcards = meds.filter(m => m.patientId === patient.id && m.type === 'medcard');
      let form = { ...initialMedcardForm };
      let labCount = 1, medNbCount = 1, statCount = 1;
      pMedcards.forEach(m => {
          const name = m.name, detail = m.detail || '', timeStr = m.times ? m.times.join(',') : '';
          if (name.startsWith('Record')) form.record = detail;
          else if (name.startsWith('DTX')) { form.dtx = detail; form.dtxTime = timeStr; }
          else if (name.startsWith('HCT')) { form.hct = detail; form.hctTime = timeStr; }
          else if (name.startsWith('LAB 1') || name === 'LAB 1') { form.lab1 = detail; form.lab1Time = timeStr; }
          else if (name.startsWith('LAB 2') || name === 'LAB 2') { form.lab2 = detail; form.lab2Time = timeStr; }
          else if (name.startsWith('LAB')) {
              if (labCount === 1) { form.lab1 = detail; form.lab1Time = timeStr; labCount++; }
              else if (labCount === 2) { form.lab2 = detail; form.lab2Time = timeStr; labCount++; }
          }
          else if (name.startsWith('Film')) form.film = detail;
          else if (name.startsWith('ทำแผล')) { form.wound = detail; form.woundTime = timeStr; }
          else if (name.startsWith('Consult')) form.consult = detail;
          else if (name.startsWith('NPO for LAB')) form.npo = detail;
          else if (name.startsWith('พ่นยา 1') || name === 'พ่นยา 1') { form.medNb1 = detail; form.medNb1Time = timeStr; }
          else if (name.startsWith('พ่นยา 2') || name === 'พ่นยา 2') { form.medNb2 = detail; form.medNb2Time = timeStr; }
          else if (name.startsWith('พ่นยา')) {
              if (medNbCount === 1) { form.medNb1 = detail; form.medNb1Time = timeStr; medNbCount++; }
              else if (medNbCount === 2) { form.medNb2 = detail; form.medNb2Time = timeStr; medNbCount++; }
          }
          else if (name.startsWith('ยา Stat/one day 1')) form.stat1 = detail;
          else if (name.startsWith('ยา Stat/one day 2')) form.stat2 = detail;
          else if (name.startsWith('ยา Stat/one day')) {
              if (statCount === 1) { form.stat1 = detail; statCount++; }
              else if (statCount === 2) { form.stat2 = detail; statCount++; }
          }
          else if (name.startsWith('อาหาร')) form.diet = detail;
          else if (name.startsWith('Flushing')) {
              if (timeStr.includes('6')) form.flush06 = true;
              if (timeStr.includes('18')) form.flush18 = true;
          }
          else if (name.startsWith('H/C day 2')) form.hc2 = detail.replace(' ', 'T');
          else if (name.startsWith('H/C day 5')) form.hc5 = detail.replace(' ', 'T');
          else if (name.startsWith('หมายเหตุ')) form.note = detail;
      });
      setMedcardForm(form); setShowAddModal(true);
  };

  const handleSaveMedcardForm = (e) => {
      e.preventDefault();
      const medsToSave = [];
      const addToList = (namePrefix, value, timesStr = '') => {
        if (!value) return;
        
        let finalName = value;
        if (namePrefix && namePrefix.toLowerCase() !== value.toLowerCase()) {
            finalName = `${namePrefix}: ${value}`;
        }

        medsToSave.push({
            patientId: patient.id, barcode: '-', name: finalName,
            detail: value, instruction: '', times: timesStr ? timesStr.split(',').map(t => parseInt(t.trim())).filter(n => !isNaN(n)) : [],
            type: 'medcard', status: 'active', isHAD: false
        });
      };

      if (medcardForm.record) addToList('Record', medcardForm.record);
      if (medcardForm.dtx) addToList('DTX', medcardForm.dtx, medcardForm.dtxTime);
      if (medcardForm.hct) addToList('HCT', medcardForm.hct, medcardForm.hctTime);
      if (medcardForm.lab1) addToList('LAB 1', medcardForm.lab1, medcardForm.lab1Time);
      if (medcardForm.lab2) addToList('LAB 2', medcardForm.lab2, medcardForm.lab2Time);
      if (medcardForm.film) addToList('Film X-ray', medcardForm.film);
      if (medcardForm.wound) addToList('ทำแผล', medcardForm.wound, medcardForm.woundTime);
      if (medcardForm.consult) addToList('Consult', medcardForm.consult);
      if (medcardForm.npo) addToList('NPO for LAB', medcardForm.npo);
      if (medcardForm.medNb1) addToList('พ่นยา 1', medcardForm.medNb1, medcardForm.medNb1Time);
      if (medcardForm.medNb2) addToList('พ่นยา 2', medcardForm.medNb2, medcardForm.medNb2Time);
      if (medcardForm.stat1) addToList('ยา Stat/one day 1', medcardForm.stat1);
      if (medcardForm.stat2) addToList('ยา Stat/one day 2', medcardForm.stat2);
      if (medcardForm.diet) addToList('อาหาร', medcardForm.diet);
      let flushTimes = [];
      if (medcardForm.flush06) flushTimes.push('6');
      if (medcardForm.flush18) flushTimes.push('18');
      if (flushTimes.length > 0) addToList('Flushing', 'Flushing', flushTimes.join(','));
      if (medcardForm.hc2) addToList('H/C day 2', medcardForm.hc2.replace('T', ' '));
      if (medcardForm.hc5) addToList('H/C day 5', medcardForm.hc5.replace('T', ' '));
      if (medcardForm.note) addToList('หมายเหตุ', medcardForm.note);
      onSaveMedcardFull(patient.id, medsToSave); setShowAddModal(false); setMedcardForm(initialMedcardForm);
  };

  const handleEditMedSubmit = (e) => {
    e.preventDefault(); const fd = new FormData(e.target); const updatedDrugName = fd.get('name');
    const performUpdate = () => {
        onUpdateMed(editingMed.id, {
          name: updatedDrugName, detail: fd.get('detail'), instruction: fd.get('instruction'),
          times: fd.get('times') ? fd.get('times').split(',').map(t => parseInt(t.trim())).filter(n => !isNaN(n)) : [],
        });
        setEditingMed(null);
    };
    if (activeTab === 'medcard') { performUpdate(); return; }
    const conflict = checkAllergyConflict(updatedDrugName, patient.allergies);
    if (conflict) showConfirm(`⚠️ แจ้งเตือนความปลอดภัยระดับสูง\n\nกำลังแก้ไขใช้ยากลุ่มเดียวกันกับยาที่แพ้ - (${conflict.toUpperCase()})\n\nยืนยันบันทึกหรือไม่?`, performUpdate);
    else performUpdate();
  };

  const handleDeleteClick = () => showConfirm("ยืนยันการลบรายการนี้อย่างถาวร?", () => { onDeleteMed(editingMed.id); setEditingMed(null); });

  const handlePrintPDF = async () => {
    if (!window.html2pdf) { 
        showAlert("กำลังโหลดระบบสร้าง PDF กรุณารอสักครู่"); 
        return; 
    }
    showAlert("กำลังเตรียมเอกสาร... กรุณารอสักครู่ (อาจใช้เวลา 2-3 วินาที)");
    const element = document.getElementById('print-medsheet-container');
    const origStyle = element.style.cssText;
    element.style.cssText = "display: block; width: 1000px; background: white; font-family: 'Sarabun', sans-serif; padding: 20px;";
    const opt = {
        margin: [10, 10, 10, 10],
        filename: `MedSheet_${patient.hn}_${new Date().getTime()}.pdf`,
        image: { type: 'jpeg', quality: 1.0 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'] }
    };
    try {
        await new Promise(r => setTimeout(r, 800));
        await window.html2pdf().set(opt).from(element).save();
        showAlert("สร้างและดาวน์โหลดไฟล์ PDF สำเร็จ");
    } catch (err) {
        console.error("PDF Error:", err); 
        showAlert("เกิดข้อผิดพลาดในการสร้างไฟล์ PDF");
    } finally {
        element.style.cssText = origStyle;
    }
  };

  const todayDateObj = new Date();
  todayDateObj.setHours(0,0,0,0);

  return (
    <div className="flex flex-col h-full font-sans bg-transparent medsheet-root relative z-10">
      
      <div id="print-medsheet-container" style={{ display: 'none', backgroundColor: 'white', width: '1200px' }}>
          <div><PrintTemplate id="print-oral" title="ใบยากิน (Oral Medication)" patient={patient} meds={meds.filter(m => m.type === 'oral')} logs={logs} dateRange={dateRange} /></div>
          <div className="page-break" style={{ height: '40px' }}></div>
          <div><PrintTemplate id="print-injection" title="ใบยาฉีด (Injection Medication)" patient={patient} meds={meds.filter(m => m.type === 'injection')} logs={logs} dateRange={dateRange} /></div>
          <div className="page-break" style={{ height: '40px' }}></div>
          <div><PrintTemplate id="print-medcard" title="MEDcard (การรักษาและพยาบาล)" patient={patient} meds={meds.filter(m => m.type === 'medcard')} logs={logs} dateRange={dateRange} /></div>
      </div>

      <header className="bg-white/80 border-b border-gray-200 px-3 py-3 md:px-8 md:py-6 flex-none print:shadow-none print:border-none print:px-0 print:py-2 z-30 rounded-b-[2rem] mx-2 shadow-sm backdrop-blur-xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-start gap-3 md:gap-5 w-full md:w-auto">
            <div className={`
              w-14 h-14 md:w-20 md:h-20 rounded-2xl flex items-center justify-center text-2xl md:text-4xl font-black border-2 shrink-0 shadow-sm
              ${patient.status === 'admitted' ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-blue-400' : 'bg-gray-200 text-gray-500 border-gray-300'}
            `}>
              {patient.bed}
            </div>
            <div className="min-w-0 flex-1">
               <h1 className="text-xl md:text-3xl font-black text-gray-800 flex items-center gap-3 truncate drop-shadow-sm">
                 {patient.name}
                 <img src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${padHN(patient.hn)}`} alt="QR Code" className="w-8 h-8 md:w-10 md:h-10 p-0.5 bg-white border border-gray-200 rounded shadow-sm shrink-0" title={`QR Code: ${padHN(patient.hn)}`} />
                 <button onClick={() => setShowEditPatientModal(true)} className="text-gray-500 hover:text-blue-600 p-1.5 rounded-full hover:bg-gray-100 transition print:hidden bg-white shadow-sm border border-gray-200" title="แก้ไขประวัติผู้ป่วย">
                    <Edit3 size={18}/>
                 </button>
               </h1>
               <div className="text-sm md:text-base text-gray-700 flex flex-wrap items-center gap-2 md:gap-3 mt-1 md:mt-2">
                 <span className="hidden md:inline-flex bg-white px-3 py-1 rounded-lg font-bold shadow-sm border border-gray-200">HN: <span className="text-blue-700">{padHN(patient.hn)}</span></span>
                 <span className="hidden md:inline-flex bg-white px-3 py-1 rounded-lg font-bold shadow-sm border border-gray-200">AN: <span className="text-blue-700">{patient.an}</span></span>
                 {patient.diagnosis && (
                     <span className="hidden md:inline-flex text-green-800 font-black max-w-[200px] md:max-w-[300px] truncate bg-green-50 px-2 py-0.5 rounded border border-green-100" title={patient.diagnosis}>{patient.diagnosis}</span>
                 )}
                 {patient.doctor && (
                     <span className="hidden md:inline-flex text-gray-600 flex items-center gap-1 font-bold bg-white px-2 py-0.5 rounded border border-gray-200"><Stethoscope size={14}/> {patient.doctor}</span>
                 )}
                 {patient.status === 'discharged' && (
                   <span className="text-xs bg-gray-700 text-white px-3 py-1 rounded-full uppercase tracking-wider font-bold shadow-sm flex items-center gap-1.5 ml-0 md:ml-2">
                     <Archive size={12}/> จำหน่ายแล้ว
                   </span>
                 )}
                 <div className="md:hidden flex items-center mt-1">
                    {(!patient.allergies || patient.allergies === '-' || patient.allergies === '') ? (
                       <span className="text-[10px] text-green-700 flex items-center gap-1 bg-green-50 px-2 py-1 rounded-lg border border-green-200 shadow-sm font-bold"><CheckCircle size={12}/> ไม่แพ้ยา</span>
                    ) : (
                       <span className="text-[10px] bg-red-500 text-white px-2 py-1 rounded-lg border border-red-600 font-black flex items-center gap-1 animate-pulse shadow-md">
                         <AlertOctagon size={12}/> แพ้: {patient.allergies}
                       </span>
                    )}
                 </div>
               </div>
            </div>
          </div>
          
          <div className="hidden md:flex gap-3 print:hidden w-full md:w-auto justify-end flex-col items-end">
             <div className="items-center gap-2 text-sm font-bold">
                 <span className="text-gray-700 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm">แพ้ยา:</span>
                 {(!patient.allergies || patient.allergies === '-' || patient.allergies === '') ? (
                   <span className="text-green-700 flex items-center gap-1.5 bg-green-50 px-3 py-1.5 rounded-lg border border-green-200 shadow-sm"><CheckCircle size={16}/> ปฏิเสธ</span>
                 ) : (
                   <span className="bg-red-500 text-white px-4 py-1.5 rounded-lg border border-red-600 font-black flex items-center gap-1.5 animate-pulse shadow-md text-sm">
                     <AlertOctagon size={18}/> {patient.allergies}
                   </span>
                 )}
               </div>
            <button onClick={handlePrintPDF} className="bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-md active:scale-95 whitespace-nowrap border border-red-700">
              <FileText size={18}/> พิมพ์ PDF
            </button>
          </div>
        </div>
      </header>

      {retroMode && (
          <div className="mx-4 md:mx-8 mt-4 bg-amber-100 border border-amber-300 text-amber-900 px-4 py-2 rounded-xl flex justify-between items-center font-bold text-sm shadow-sm animate-in fade-in slide-in-from-top-2">
              <span className="flex items-center gap-2"><History size={16}/> กำลังอยู่ในโหมดลงเวลาย้อนหลัง (เวลาที่กำหนด: {retroDate.split('-').reverse().join('/')} เวลา {retroTime} น.)</span>
              <button onClick={() => setRetroMode(false)} className="bg-white/50 hover:bg-white px-3 py-1 rounded-lg text-amber-700 hover:text-amber-900 transition border border-amber-200">ยกเลิกโหมดนี้</button>
          </div>
      )}

      <div className={`px-2 md:px-8 flex flex-col md:flex-row justify-between items-start md:items-end flex-none print:hidden z-20 ${retroMode ? 'mt-2' : 'mt-4 md:mt-6'}`}>
        <div className="flex gap-2 overflow-x-auto no-scrollbar p-1 w-full md:w-auto mb-2 md:mb-0">
           <TabButton active={activeTab === 'oral'} onClick={() => setActiveTab('oral')} icon={<Pill size={18}/>} label="ยากิน" color="green" />
           <TabButton active={activeTab === 'injection'} onClick={() => setActiveTab('injection')} icon={<Syringe size={18}/>} label="ยาฉีด" color="red" />
           <TabButton active={activeTab === 'medcard'} onClick={() => setActiveTab('medcard')} icon={<ClipboardList size={18}/>} label="MEDcard (การพยาบาล)" color="purple" />
        </div>
        {patient.status === 'admitted' && (
          <div className="flex gap-2 w-full md:w-auto pb-2 md:pb-1 overflow-x-auto no-scrollbar">
              {activeTab !== 'medcard' && (
                 <button onClick={() => setShowRetroModal(true)} className={`bg-white border text-amber-600 border-amber-400 hover:bg-amber-50 px-3 py-2.5 md:px-4 md:py-3 rounded-xl md:rounded-2xl font-bold flex items-center gap-2 transition-all transform hover:-translate-y-1 active:scale-95 text-[11px] md:text-sm whitespace-nowrap shadow-sm ${retroMode ? 'ring-2 ring-amber-400 bg-amber-50' : ''}`}>
                    <History size={16} className="font-black"/> <span className="md:inline">{retroMode ? 'เปลี่ยนเวลาย้อนหลัง' : 'ลงเวลาย้อนหลัง'}</span>
                 </button>
              )}
              <button onClick={() => { 
                  if(activeTab === 'medcard') openMedcardForm();
                  else { setShowAddModal(true); setBulkFormData(initialBulkData); }
              }} className={`${activeTab === 'medcard' ? 'bg-gradient-to-r from-purple-500 to-purple-600 shadow-md border-purple-600' : (activeTab === 'injection' ? 'bg-gradient-to-r from-red-500 to-red-600 shadow-md border-red-600' : 'bg-gradient-to-r from-green-500 to-green-600 shadow-md border-green-600')} text-white border px-3 py-2.5 md:px-5 md:py-3 rounded-xl md:rounded-2xl font-bold flex items-center gap-2 transition-all transform hover:-translate-y-1 active:scale-95 text-[11px] md:text-sm whitespace-nowrap`}>
                 {activeTab === 'medcard' ? <><Edit3 size={16} className="md:w-[18px] md:h-[18px]"/> <span className="md:inline">จัดการ MEDcard</span></> : <><Plus size={16} className="md:w-[18px] md:h-[18px] font-black"/> <span className="md:inline">เพิ่มรายการยา (ทีละ 10)</span></>}
              </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-hidden px-1 pb-1 md:px-8 md:pb-8 print:p-0 print:overflow-visible relative z-10">
        <div className="bg-white rounded-t-2xl md:rounded-3xl overflow-hidden shadow-lg h-full print:shadow-none print:border-black print:rounded-none relative print:bg-white border-t border-x md:border border-gray-200">
          <div className="overflow-auto h-full no-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
            
          {activeTab === 'medcard' ? (
             <div className="bg-white h-full overflow-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
                 <table className="w-full text-left border-collapse">
                    <thead className="bg-purple-50 border-b border-purple-200 sticky top-0 z-10 text-purple-900 font-black shadow-sm">
                       <tr>
                          <th className="p-3 md:p-4 w-12 md:w-16 text-center text-sm md:text-lg border-r border-purple-200">#</th>
                          <th className="p-3 md:p-4 text-sm md:text-lg border-r border-purple-200">รายการรักษา / พยาบาล</th>
                          <th className="p-3 md:p-4 w-28 md:w-40 text-center text-sm md:text-lg">การจัดการ</th>
                       </tr>
                    </thead>
                    <tbody className="font-medium text-gray-800">
                       {sortedMeds.map((med, idx) => (
                           <tr key={med.id} className="border-b border-gray-200 hover:bg-purple-50/50 transition-colors bg-white">
                              <td className="p-3 md:p-4 text-center font-black text-gray-500 text-sm md:text-lg border-r border-gray-200 bg-gray-50/50">{idx + 1}</td>
                              <td className="p-3 md:p-4 border-r border-gray-200">
                                 <div className="font-black text-base md:text-xl text-purple-900 flex items-center gap-2">
                                     <ActivitySquare size={18} className="text-purple-600 md:w-5 md:h-5"/> {med.name}
                                 </div>
                                 {med.detail && med.name !== med.detail && (
                                     <div className="text-gray-700 mt-2 font-bold text-sm md:text-base whitespace-pre-wrap">{med.detail}</div>
                                 )}
                                 {med.times && med.times.length > 0 && (
                                     <div className="mt-2 md:mt-3 text-xs md:text-sm font-bold text-purple-800 bg-purple-50 border border-purple-200 inline-block px-2 md:px-3 py-1 md:py-1.5 rounded-lg shadow-sm">
                                        <Clock size={12} className="inline mr-1 -mt-0.5 md:w-[14px] md:h-[14px]"/> เวลาที่กำหนด: {med.times.join(', ')} น.
                                     </div>
                                 )}
                              </td>
                              <td className="p-3 md:p-4 text-center align-middle">
                                 <button onClick={openMedcardForm} className="px-3 py-2 md:px-5 md:py-2.5 bg-white text-purple-800 rounded-xl font-bold shadow-sm hover:bg-purple-50 transition border border-purple-200 flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 mx-auto active:scale-95 text-xs md:text-base">
                                    <Edit3 size={16}/> <span className="hidden md:inline">แก้ไข MEDcard</span>
                                 </button>
                              </td>
                           </tr>
                       ))}
                       {sortedMeds.length === 0 && (
                           <tr>
                               <td colSpan={3} className="text-center p-16 text-gray-400 font-bold bg-gray-50">
                                  <ClipboardList size={48} className="mx-auto mb-4 text-gray-300"/>
                                  ยังไม่มีรายการรักษา หรือบันทึกทางการพยาบาล
                               </td>
                           </tr>
                       )}
                    </tbody>
                 </table>
             </div>
          ) : (
             <table className="w-full text-left border-collapse min-w-max bg-white">
                <thead className="bg-gray-100 text-gray-800 text-sm font-black uppercase border-b border-gray-300 print:bg-gray-200 print:border-black sticky top-0 z-30 shadow-sm">
                <tr>
                    <th className="p-2 md:p-3 text-center border-r border-gray-300 print:border-black bg-gray-100 text-sm md:text-base shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] min-w-[40px] md:min-w-[50px] w-[40px] md:w-[50px] sticky left-0 z-40">#</th>
                    <th className="p-2 md:p-3 border-r border-gray-300 print:border-black bg-gray-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] min-w-[180px] md:min-w-[280px] w-[180px] md:w-[280px] sticky left-[40px] md:left-[50px] z-40">รายการยา</th>
                    <th className="p-2 md:p-3 text-center border-r border-gray-300 print:border-black bg-gray-100 text-xs md:text-sm tracking-wide shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] min-w-[50px] md:min-w-[70px] w-[50px] md:w-[70px] sticky left-[220px] md:left-[330px] z-40">เวลา</th>
                    {dateRange.map((d, i) => {
                        const isToday = d.getDate() === todayDateObj.getDate() && d.getMonth() === todayDateObj.getMonth();
                        const isFuture = d > todayDateObj;
                        const headerColor = activeTab === 'injection' ? 'text-red-800 border-b-red-500' : 'text-green-800 border-b-green-500';
                        const badgeColor = activeTab === 'injection' ? 'bg-red-600' : 'bg-green-600';
                        return (
                            <th key={i} className={`p-1 md:p-2 min-w-[70px] md:min-w-[110px] text-center border-r border-gray-200 print:border-black bg-gray-50 ${isToday ? `${headerColor} border-b-4 print:bg-gray-200 print:text-black`:''} ${isFuture ? 'hidden md:table-cell' : ''}`}>
                                <div className="text-[10px] md:text-xs font-black">{formatDateThai(d)}</div>
                                {isToday && <div className={`text-[9px] md:text-[10px] ${badgeColor} text-white px-2 py-0.5 rounded-full inline-block mt-0.5 md:mt-1 font-bold shadow-sm`}>วันนี้</div>}
                            </th>
                        )
                    })}
                </tr>
                </thead>
                <tbody className="text-sm font-medium">
                {sortedMeds.map((med, idx) => (
                    <tr key={med.id} className={`border-b border-gray-200 print:border-black hover:bg-gray-50 transition-colors bg-white print:bg-white`}>
                    <td className="p-2 md:p-3 text-center border-r border-gray-300 print:border-black text-gray-500 font-black align-top pt-3 md:pt-4 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] bg-gray-50/80 text-xs md:text-sm min-w-[40px] md:min-w-[50px] w-[40px] md:w-[50px] sticky left-0 z-20">{idx+1}</td>
                    <td className={`p-2 md:p-3 border-r border-gray-300 print:border-black align-top relative shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] transition-colors ${med.status === 'off' ? 'bg-gray-100' : (med.isHAD ? 'bg-red-50' : 'bg-white')} min-w-[180px] md:min-w-[280px] w-[180px] md:w-[280px] sticky left-[40px] md:left-[50px] z-20`}>
                        <div className={med.status === 'off' ? 'opacity-50' : ''}>
                        <div className="text-xs md:text-base font-black text-gray-800 flex flex-wrap items-center gap-1 md:gap-1.5 whitespace-normal break-words">
                            {med.status === 'off' && <span className="text-red-600 font-black whitespace-nowrap bg-red-100 px-1 md:px-1.5 rounded border border-red-300 text-[9px] md:text-xs">[OFF]</span>}
                            {med.isIVF && <span className="bg-blue-600 text-white px-1 md:px-1.5 py-0.5 rounded shadow-sm text-[8px] md:text-[9px] font-bold ml-0.5 md:ml-1">IVF</span>}
                            {med.isHAD && <span className="bg-red-600 text-white px-1 md:px-1.5 py-0.5 rounded shadow-sm text-[8px] md:text-[9px] font-bold ml-0.5 md:ml-1">HAD</span>}
                            <span className={med.status === 'off' ? 'line-through text-gray-500' : (med.isHAD ? 'text-red-800 font-black' : '')}>{med.name}</span>
                        </div>
                        {activeTab !== 'medcard' && <div className="text-[10px] md:text-sm text-gray-700 mt-1 font-bold whitespace-normal break-words leading-tight">{med.detail}</div>}
                        {med.instruction && (
                            <div className={`mt-1.5 md:mt-2 inline-block px-1.5 py-0.5 md:px-2 md:py-1 rounded-lg text-[9px] md:text-[11px] font-bold border shadow-sm whitespace-normal break-words ${med.status === 'off' ? 'bg-gray-200 text-gray-500 border-gray-300' : (activeTab === 'injection' ? 'bg-red-50 text-red-800 border-red-200' : 'bg-green-50 text-green-800 border-green-200')}`}>
                                {med.instruction}
                            </div>
                        )}
                        </div>
                        <div className="mt-2 md:mt-3 flex gap-1 md:gap-1.5 print:hidden flex-wrap border-t border-gray-200 pt-2 md:pt-2.5">
                            {med.status === 'active' && patient.status === 'admitted' && (
                            <>
                                <button type="button" onClick={(e) => { e.stopPropagation(); setEditingMed(med); }} className={`text-[9px] md:text-[10px] bg-white px-1.5 py-0.5 md:px-2 md:py-1 rounded-md font-bold flex items-center gap-1 shadow-sm transition active:scale-95 border ${activeTab === 'injection' ? 'text-red-800 hover:bg-red-50 border-red-200' : 'text-green-800 hover:bg-green-50 border-green-200'}`}>
                                    <Pencil size={10}/> <span className="hidden md:inline">แก้ไข</span>
                                </button>
                                <button type="button" onClick={(e) => { e.stopPropagation(); onStopOrder(med.id); }} className="text-[9px] md:text-[10px] bg-red-50 text-red-700 px-1.5 py-0.5 md:px-2 md:py-1 rounded-md border border-red-200 hover:bg-red-100 font-bold flex items-center gap-1 shadow-sm transition active:scale-95">
                                    <Ban size={10}/> STOP
                                </button>
                                {activeTab !== 'medcard' && (
                                    <>
                                        {activeTab === 'injection' && (
                                            <button type="button" onClick={(e) => { e.stopPropagation(); onToggleIVF(med.id, med.isIVF); }} className={`text-[9px] md:text-[10px] px-1.5 py-0.5 md:px-2 md:py-1 rounded-md border font-bold flex items-center gap-1 shadow-sm transition active:scale-95 ${med.isIVF ? 'bg-blue-600 text-white border-blue-700 hover:bg-blue-700' : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50'}`}>
                                                <Activity size={10}/> {med.isIVF ? 'เลิก IVF' : '+ IVF'}
                                            </button>
                                        )}
                                        <button type="button" onClick={(e) => { e.stopPropagation(); onToggleHAD(med.id, med.isHAD); }} className={`text-[9px] md:text-[10px] px-1.5 py-0.5 md:px-2 md:py-1 rounded-md border font-bold flex items-center gap-1 shadow-sm transition active:scale-95 ${med.isHAD ? 'bg-red-600 text-white border-red-700 hover:bg-red-700' : 'bg-white text-red-700 border-red-200 hover:bg-red-50'}`}>
                                            <ShieldAlert size={10}/> {med.isHAD ? 'เลิก HAD' : '+ HAD'}
                                        </button>
                                    </>
                                )}
                            </>
                            )}
                        </div>
                        {med.status === 'off' && (
                            <div className="mt-1.5 md:mt-2 flex items-center gap-2">
                                <div className="text-[9px] md:text-[10px] text-red-600 border border-red-300 bg-red-50 px-1 md:px-1.5 py-0.5 rounded font-bold shadow-sm">OFF: {med.offBy}</div>
                                <button type="button" onClick={(e) => { e.stopPropagation(); onUndoStopOrder(med.id); }} className="text-[9px] md:text-[10px] bg-green-50 text-green-700 px-1.5 py-0.5 md:px-2 md:py-1 rounded border border-green-300 hover:bg-green-100 font-bold flex items-center gap-1 shadow-sm transition active:scale-95 print:hidden">
                                    <RotateCcw size={10}/> ยกเลิก OFF
                                </button>
                            </div>
                        )}
                    </td>
                    <td className="p-0 border-r border-gray-300 print:border-black align-top bg-gray-50/50 print:bg-white shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] min-w-[50px] md:min-w-[70px] w-[50px] md:w-[70px] sticky left-[220px] md:left-[330px] z-20">
                        {med.times.length > 0 ? med.times.map(t => (
                        <div key={t} className="h-12 md:h-14 flex items-center justify-center border-b border-gray-200 print:border-gray-400 font-black text-gray-600 print:text-black text-xs md:text-sm">{t}.00</div>
                        )) : (
                        <div className="h-16 md:h-20 flex items-center justify-center text-[10px] md:text-xs text-gray-400 italic font-black">PRN</div>
                        )}
                    </td>
                    {dateRange.map((date, i) => {
                        const dateKey = date.toISOString().split('T')[0];
                        const isToday = date.getDate() === todayDateObj.getDate() && date.getMonth() === todayDateObj.getMonth();
                        const isFuture = date > todayDateObj;
                        const isGlobalOff = med.status === 'off';
                        const todayBg = activeTab === 'injection' ? 'bg-red-50/30' : 'bg-green-50/30';
                        const hoverBg = activeTab === 'injection' ? 'hover:bg-red-50' : 'hover:bg-green-50';
                        return (
                        <td key={i} className={`p-0 border-r border-gray-200 print:border-black align-top bg-white ${isToday ? `${todayBg} print:bg-white` : ''} ${isFuture ? 'hidden md:table-cell' : ''}`}>
                            {med.times.length > 0 ? (
                            med.times.map(t => {
                                const timeStr = `${t}:00`;
                                const log = logs.find(l => l.medId === med.id && l.dateKey === dateKey && parseInt(l.timestamp) === t);
                                return (
                                <div key={t} onClick={() => handleCellClick(med, timeStr, dateKey)}
                                    className={`h-12 md:h-14 border-b border-gray-200 print:border-gray-400 flex items-center justify-center transition-all relative group select-none cursor-pointer
                                    ${isGlobalOff ? 'bg-gray-100 cursor-not-allowed' : hoverBg}
                                    ${log?.status === 'given' ? 'bg-green-100 hover:bg-green-200 ring-inset ring-2 ring-green-400 shadow-inner' : ''}
                                    ${log?.status === 'hold' ? 'bg-red-50 hover:bg-red-100 shadow-inner ring-1 ring-inset ring-red-200' : ''}
                                    `}
                                >
                                    {isGlobalOff && !log ? (
                                    <span className="text-gray-300 font-black tracking-widest text-[9px] opacity-70">STOP</span>
                                    ) : log ? (
                                    log.status === 'given' ? (
                                        <div className="text-center leading-3 animate-in zoom-in duration-100">
                                        <div className="text-[10px] md:text-xs font-black text-green-800">{log.realTime}</div>
                                        <div className="text-[7px] md:text-[8px] text-gray-600 font-bold mt-0.5 truncate max-w-[40px] md:max-w-[60px] mx-auto">{log.user}</div>
                                        </div>
                                    ) : (
                                        <div className="text-center leading-3 animate-in zoom-in duration-100">
                                        <div className="text-red-600 font-black text-[10px] md:text-xs mb-0.5">HOLD</div>
                                        <div className="text-[7px] md:text-[8px] text-red-800 font-bold truncate max-w-[40px] md:max-w-[60px] mx-auto">{log.user}</div>
                                        </div>
                                    )
                                    ) : (
                                    <div className={`hidden md:group-hover:block text-xl font-light print:hidden ${activeTab === 'injection' ? 'text-red-300' : 'text-green-300'}`}>+</div>
                                    )}
                                </div>
                                );
                            })
                            ) : (
                            <div className={`h-16 md:h-20 p-1 md:p-1.5 flex flex-wrap gap-1 content-start relative group ${isGlobalOff ? 'bg-gray-100' : 'hover:bg-gray-50 transition-colors'}`}>
                                {logs.filter(l => l.medId === med.id && l.dateKey === dateKey).map(log => (
                                <div key={log.id} onClick={(e) => { e.stopPropagation(); if(log.status === 'given') {onLogAction('update', {id: log.id, fields: {status: 'hold'}})} else {onLogAction('delete', {id: log.id})} }} className="cursor-pointer relative z-10 animate-in zoom-in duration-100">
                                    <span className={`text-[8px] md:text-[9px] border px-1 md:px-1.5 py-0.5 rounded shadow-sm flex flex-col items-center min-w-[32px] md:min-w-[38px] transition-colors font-bold ${log.status === 'given' ? 'border-green-400 bg-green-100 text-green-900 hover:bg-red-100' : 'border-red-300 bg-red-50 text-red-700 hover:bg-gray-100'}`}>
                                    <span>{log.status === 'given' ? (log.realTime || log.timestamp) : 'HOLD'}</span>
                                    <span className="text-[6px] md:text-[7px] opacity-80 mt-0.5 truncate max-w-[28px] md:max-w-[32px]">{log.user}</span>
                                    </span>
                                </div>
                                ))}
                                {!isGlobalOff && patient.status === 'admitted' && (
                                <button onClick={(e) => { e.stopPropagation(); handlePrnAdd(med, dateKey); }} className="w-5 h-5 md:w-6 md:h-6 rounded-full border border-dashed border-gray-300 bg-white flex items-center justify-center text-gray-400 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all shadow-sm print:hidden relative z-10">
                                    <Plus size={12}/>
                                </button>
                                )}
                            </div>
                            )}
                        </td>
                        );
                    })}
                    </tr>
                ))}
                </tbody>
             </table>
          )}
          </div>
        </div>
      </div>

      {/* ADD MED MODAL */}
      {showAddModal && activeTab !== 'medcard' && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4 print:hidden">
           <div className="bg-white rounded-2xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh] shadow-2xl">
              <div className={`${activeTab === 'injection' ? 'bg-red-600' : 'bg-green-600'} p-4 md:p-5 text-white font-black text-lg md:text-xl flex justify-between items-center flex-none`}>
                 <span className="flex items-center gap-3"><Plus size={24} className="bg-white/20 rounded-lg p-1 hidden md:block"/> เพิ่มรายการ ({activeTab === 'oral' ? 'ยากิน' : 'ยาฉีด'})</span>
                 <button onClick={() => setShowAddModal(false)} className="hover:bg-white/20 p-1.5 rounded-full transition"><XCircle size={24}/></button>
              </div>
              <form onSubmit={handleSaveBulkMeds} className="flex-1 overflow-hidden flex flex-col">
                 <div className="p-4 md:p-6 overflow-y-auto flex-1 bg-gray-50">
                     <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-300">
                     <table className="w-full border-collapse">
                         <thead className="bg-gray-100 border-b border-gray-300 text-gray-800 text-sm font-black">
                             <tr>
                                 <th className="p-3 md:p-4 text-center w-10 md:w-14 border-r border-gray-300">#</th>
                                 <th className="p-3 md:p-4 text-left border-r border-gray-300">ชื่อรายการยา <span className="text-red-500">*</span></th>
                                 <th className="p-3 md:p-4 text-left w-1/3">เวลา (เลือกจากลิสต์ได้)</th>
                             </tr>
                         </thead>
                         <tbody className="bg-white">
                             {bulkFormData.map((row, index) => (
                                 <tr key={index} className="border-b border-gray-200 last:border-0 hover:bg-gray-50 transition-colors">
                                     <td className="p-2 md:p-3 text-center text-gray-400 font-bold bg-gray-50 border-r border-gray-300 text-xs md:text-sm">{index + 1}</td>
                                     <td className="p-2 md:p-3 border-r border-gray-300">
                                         <textarea rows="2" value={row.name} onChange={(e) => { const newData = [...bulkFormData]; newData[index].name = e.target.value; setBulkFormData(newData); }} onPaste={(e) => handlePasteToBulk(e, index, 'name')} className={`w-full p-2 rounded-lg outline-none text-sm md:text-base font-bold text-gray-800 placeholder-gray-300 bg-white border border-gray-200 focus:ring-2 transition-all resize-none ${activeTab === 'injection' ? 'focus:ring-red-500' : 'focus:ring-green-500'}`} placeholder="วางข้อมูลที่นี่..." />
                                     </td>
                                     <td className="p-2 md:p-3">
                                         <input list="common-med-times" value={row.times} onChange={(e) => { const newData = [...bulkFormData]; newData[index].times = e.target.value; setBulkFormData(newData); }} onPaste={(e) => handlePasteToBulk(e, index, 'times')} className={`w-full p-2 rounded-lg outline-none text-sm md:text-base font-bold text-gray-800 placeholder-gray-300 bg-white border border-gray-200 focus:ring-2 transition-all ${activeTab === 'injection' ? 'focus:ring-red-500' : 'focus:ring-green-500'}`} placeholder="เวลา" />
                                     </td>
                                 </tr>
                             ))}
                         </tbody>
                     </table>
                     </div>
                     <p className={`text-xs md:text-sm mt-4 font-bold p-3 rounded-xl inline-block border shadow-sm ${activeTab === 'injection' ? 'text-red-800 bg-red-50 border-red-200' : 'text-green-800 bg-green-50 border-green-200'}`}>
                         * ระบบจะบันทึกเฉพาะแถวที่มีข้อมูลเท่านั้น
                     </p>
                 </div>
                 <div className="flex justify-end gap-3 p-4 md:p-5 border-t border-gray-300 bg-gray-100 flex-none">
                    <button type="button" onClick={() => setShowAddModal(false)} className="px-5 py-2.5 bg-white border border-gray-300 rounded-xl text-gray-700 font-bold hover:bg-gray-50 shadow-sm transition active:scale-95 text-sm md:text-base">ยกเลิก</button>
                    <button type="submit" className={`px-6 py-2.5 text-white rounded-xl font-bold shadow-md transition flex items-center gap-2 active:scale-95 text-sm md:text-base ${activeTab === 'injection' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}><Save size={18}/> บันทึกข้อมูล</button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* MEDCARD MODAL */}
      {showAddModal && activeTab === 'medcard' && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4 print:hidden">
           <div className="bg-white rounded-2xl md:rounded-3xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh] shadow-2xl">
              <div className="bg-purple-600 p-4 md:p-5 text-white font-black text-lg md:text-xl flex justify-between items-center flex-none">
                 <span className="flex items-center gap-3"><Edit3 size={24} className="bg-white/20 rounded-lg p-1 hidden md:block"/> จัดการ MEDcard (การรักษา / พยาบาล)</span>
                 <button onClick={() => setShowAddModal(false)} className="hover:bg-white/20 p-1.5 rounded-full transition"><XCircle size={24}/></button>
              </div>
              <form id="medcard-form" onSubmit={handleSaveMedcardForm} className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50 space-y-4 md:space-y-5">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
                      <div className="bg-white p-4 md:p-5 rounded-2xl border border-gray-200 shadow-sm">
                          <h3 className="font-black text-purple-800 border-b border-purple-100 pb-2 mb-4 flex items-center gap-2"><ActivitySquare size={18}/> การเฝ้าระวัง (Monitoring)</h3>
                          <div className="space-y-3">
                              <div><label className="block text-xs font-bold text-green-700 mb-1">Record (เช่น V/S, I/O)</label><input list="record-list" value={medcardForm.record} onChange={e => setMedcardForm({...medcardForm, record: e.target.value})} className="w-full border border-green-300 p-2.5 rounded-xl text-sm font-bold text-green-900 bg-green-50/40 focus:ring-2 focus:ring-green-500 outline-none placeholder-green-300" placeholder="ระบุสิ่งที่ต้อง Record..." /></div>
                              <div className="grid grid-cols-2 gap-3">
                                  <div><label className="block text-xs font-bold text-purple-700 mb-1">DTX (เจาะน้ำตาล)</label><input list="dtx-list" value={medcardForm.dtx} onChange={e => setMedcardForm({...medcardForm, dtx: e.target.value})} className="w-full border border-purple-300 p-2.5 rounded-xl text-sm font-bold text-purple-900 bg-purple-50/40 focus:ring-2 focus:ring-purple-500 outline-none placeholder-purple-300" placeholder="เช่น Keep > 80" /></div>
                                  <div><label className="block text-xs font-bold text-purple-700 mb-1">เวลา DTX</label><input list="dtx-times" value={medcardForm.dtxTime} onChange={e => setMedcardForm({...medcardForm, dtxTime: e.target.value})} className="w-full border border-purple-300 p-2.5 rounded-xl text-sm font-bold text-purple-900 bg-purple-50/40 focus:ring-2 focus:ring-purple-500 outline-none placeholder-purple-300" placeholder="6, 11, 16, 21" /></div>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                  <div><label className="block text-xs font-bold text-blue-700 mb-1">HCT</label><input value={medcardForm.hct} onChange={e => setMedcardForm({...medcardForm, hct: e.target.value})} className="w-full border border-blue-300 p-2.5 rounded-xl text-sm font-bold text-blue-900 bg-blue-50/40 focus:ring-2 focus:ring-blue-500 outline-none placeholder-blue-300" placeholder="เช่น Keep > 30%" /></div>
                                  <div><label className="block text-xs font-bold text-blue-700 mb-1">เวลา HCT</label><input list="dtx-times" value={medcardForm.hctTime} onChange={e => setMedcardForm({...medcardForm, hctTime: e.target.value})} className="w-full border border-blue-300 p-2.5 rounded-xl text-sm font-bold text-blue-900 bg-blue-50/40 focus:ring-2 focus:ring-blue-500 outline-none placeholder-blue-300" placeholder="เวลา" /></div>
                              </div>
                              <div><label className="block text-xs font-bold text-gray-700 mb-1">NPO (งดน้ำงดอาหาร)</label><input list="npo-list" value={medcardForm.npo} onChange={e => setMedcardForm({...medcardForm, npo: e.target.value})} className="w-full border border-gray-300 p-2.5 rounded-xl text-sm font-bold text-gray-800 focus:ring-2 focus:ring-purple-500 outline-none" placeholder="เช่น NPO MN for OR" /></div>
                          </div>
                      </div>
                      <div className="bg-white p-4 md:p-5 rounded-2xl border border-gray-200 shadow-sm">
                          <h3 className="font-black text-purple-800 border-b border-purple-100 pb-2 mb-4 flex items-center gap-2"><Syringe size={18}/> การตรวจ / ส่งตรวจ (Labs / X-ray)</h3>
                          <div className="space-y-3">
                              <div className="grid grid-cols-2 gap-3">
                                  <div><label className="block text-xs font-bold text-red-700 mb-1">LAB 1</label><input list="lab-list" value={medcardForm.lab1} onChange={e => setMedcardForm({...medcardForm, lab1: e.target.value})} className="w-full border border-red-300 p-2.5 rounded-xl text-sm font-bold text-red-900 bg-red-50/40 focus:ring-2 focus:ring-red-500 outline-none placeholder-red-300" placeholder="CBC, BUN, Cr..." /></div>
                                  <div><label className="block text-xs font-bold text-red-700 mb-1">เวลา LAB 1</label><input list="dtx-times" value={medcardForm.lab1Time} onChange={e => setMedcardForm({...medcardForm, lab1Time: e.target.value})} className="w-full border border-red-300 p-2.5 rounded-xl text-sm font-bold text-red-900 bg-red-50/40 focus:ring-2 focus:ring-red-500 outline-none placeholder-red-300" placeholder="เวลา" /></div>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                  <div><label className="block text-xs font-bold text-red-700 mb-1">LAB 2</label><input list="lab-list" value={medcardForm.lab2} onChange={e => setMedcardForm({...medcardForm, lab2: e.target.value})} className="w-full border border-red-300 p-2.5 rounded-xl text-sm font-bold text-red-900 bg-red-50/40 focus:ring-2 focus:ring-red-500 outline-none" /></div>
                                  <div><label className="block text-xs font-bold text-red-700 mb-1">เวลา LAB 2</label><input list="dtx-times" value={medcardForm.lab2Time} onChange={e => setMedcardForm({...medcardForm, lab2Time: e.target.value})} className="w-full border border-red-300 p-2.5 rounded-xl text-sm font-bold text-red-900 bg-red-50/40 focus:ring-2 focus:ring-red-500 outline-none" /></div>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                  <div><label className="block text-xs font-bold text-red-700 mb-1">H/C Day 2</label><input type="datetime-local" value={medcardForm.hc2} onChange={e => setMedcardForm({...medcardForm, hc2: e.target.value})} className="w-full border border-red-300 p-2.5 rounded-xl text-sm font-bold text-red-900 bg-red-50/40 focus:ring-2 focus:ring-red-500 outline-none" /></div>
                                  <div><label className="block text-xs font-bold text-red-700 mb-1">H/C Day 5</label><input type="datetime-local" value={medcardForm.hc5} onChange={e => setMedcardForm({...medcardForm, hc5: e.target.value})} className="w-full border border-red-300 p-2.5 rounded-xl text-sm font-bold text-red-900 bg-red-50/40 focus:ring-2 focus:ring-red-500 outline-none" /></div>
                              </div>
                              <div><label className="block text-xs font-bold text-orange-800 mb-1">Film X-ray</label><input list="xray-list" value={medcardForm.film} onChange={e => setMedcardForm({...medcardForm, film: e.target.value})} className="w-full border border-orange-300 p-2.5 rounded-xl text-sm font-bold text-orange-900 bg-orange-50/40 focus:ring-2 focus:ring-orange-500 outline-none placeholder-orange-300" placeholder="เช่น CXR upright" /></div>
                          </div>
                      </div>
                      <div className="bg-white p-4 md:p-5 rounded-2xl border border-gray-200 shadow-sm">
                          <h3 className="font-black text-purple-800 border-b border-purple-100 pb-2 mb-4 flex items-center gap-2"><Plus size={18}/> การรักษา / พยาบาล (Treatment)</h3>
                          <div className="space-y-3">
                              <div className="grid grid-cols-2 gap-3">
                                  <div><label className="block text-xs font-bold text-gray-700 mb-1">ทำแผล (D/S)</label><input list="wound-list" value={medcardForm.wound} onChange={e => setMedcardForm({...medcardForm, wound: e.target.value})} className="w-full border border-gray-300 p-2.5 rounded-xl text-sm font-bold text-gray-800 focus:ring-2 focus:ring-purple-500 outline-none" placeholder="Dry dressing" /></div>
                                  <div><label className="block text-xs font-bold text-gray-700 mb-1">เวลาทำแผล</label><input list="common-med-times" value={medcardForm.woundTime} onChange={e => setMedcardForm({...medcardForm, woundTime: e.target.value})} className="w-full border border-gray-300 p-2.5 rounded-xl text-sm font-bold text-gray-800 focus:ring-2 focus:ring-purple-500 outline-none" placeholder="เวลา" /></div>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                  <div><label className="block text-xs font-bold text-gray-700 mb-1">พ่นยา 1</label><input list="mednb-list" value={medcardForm.medNb1} onChange={e => setMedcardForm({...medcardForm, medNb1: e.target.value})} className="w-full border border-gray-300 p-2.5 rounded-xl text-sm font-bold text-gray-800 focus:ring-2 focus:ring-purple-500 outline-none" placeholder="เช่น NB: Berodual" /></div>
                                  <div><label className="block text-xs font-bold text-gray-700 mb-1">เวลาพ่นยา 1</label><input list="common-med-times" value={medcardForm.medNb1Time} onChange={e => setMedcardForm({...medcardForm, medNb1Time: e.target.value})} className="w-full border border-gray-300 p-2.5 rounded-xl text-sm font-bold text-gray-800 focus:ring-2 focus:ring-purple-500 outline-none" placeholder="เวลา" /></div>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                  <div><label className="block text-xs font-bold text-gray-700 mb-1">พ่นยา 2</label><input list="mednb-list" value={medcardForm.medNb2} onChange={e => setMedcardForm({...medcardForm, medNb2: e.target.value})} className="w-full border border-gray-300 p-2.5 rounded-xl text-sm font-bold text-gray-800 focus:ring-2 focus:ring-purple-500 outline-none" /></div>
                                  <div><label className="block text-xs font-bold text-gray-700 mb-1">เวลาพ่นยา 2</label><input list="common-med-times" value={medcardForm.medNb2Time} onChange={e => setMedcardForm({...medcardForm, medNb2Time: e.target.value})} className="w-full border border-gray-300 p-2.5 rounded-xl text-sm font-bold text-gray-800 focus:ring-2 focus:ring-purple-500 outline-none" /></div>
                              </div>
                              <div><label className="block text-xs font-bold text-gray-700 mb-1">Consult (ส่งปรึกษา)</label><input list="consult-list" value={medcardForm.consult} onChange={e => setMedcardForm({...medcardForm, consult: e.target.value})} className="w-full border border-gray-300 p-2.5 rounded-xl text-sm font-bold text-gray-800 focus:ring-2 focus:ring-purple-500 outline-none" placeholder="ปรึกษาแผนก..." /></div>
                          </div>
                      </div>
                      <div className="bg-white p-4 md:p-5 rounded-2xl border border-gray-200 shadow-sm">
                          <h3 className="font-black text-purple-800 border-b border-purple-100 pb-2 mb-4 flex items-center gap-2"><ClipboardList size={18}/> ยาฉุกเฉิน & อื่นๆ (Stat / Note)</h3>
                          <div className="space-y-3">
                              <div><label className="block text-xs font-bold text-gray-700 mb-1">อาหาร (Diet)</label><input list="diet-list" value={medcardForm.diet} onChange={e => setMedcardForm({...medcardForm, diet: e.target.value})} className="w-full border border-gray-300 p-2.5 rounded-xl text-sm font-bold text-gray-800 focus:ring-2 focus:ring-purple-500 outline-none" placeholder="เช่น BD, LD, SD..." /></div>
                              <div className="grid grid-cols-2 gap-3">
                                  <div><label className="block text-xs font-bold text-gray-700 mb-1">ยา Stat / One day (1)</label><input value={medcardForm.stat1} onChange={e => setMedcardForm({...medcardForm, stat1: e.target.value})} className="w-full border border-gray-300 p-2.5 rounded-xl text-sm font-bold text-gray-800 focus:ring-2 focus:ring-purple-500 outline-none" /></div>
                                  <div><label className="block text-xs font-bold text-gray-700 mb-1">ยา Stat / One day (2)</label><input value={medcardForm.stat2} onChange={e => setMedcardForm({...medcardForm, stat2: e.target.value})} className="w-full border border-gray-300 p-2.5 rounded-xl text-sm font-bold text-gray-800 focus:ring-2 focus:ring-purple-500 outline-none" /></div>
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-gray-700 mb-2">Flushing (ทำความสะอาดสายน้ำเกลือ)</label>
                                  <div className="flex gap-4">
                                      <label className="flex items-center gap-2 text-sm font-bold text-gray-800"><input type="checkbox" checked={medcardForm.flush06} onChange={e => setMedcardForm({...medcardForm, flush06: e.target.checked})} className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500" /> 06.00 น.</label>
                                      <label className="flex items-center gap-2 text-sm font-bold text-gray-800"><input type="checkbox" checked={medcardForm.flush18} onChange={e => setMedcardForm({...medcardForm, flush18: e.target.checked})} className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500" /> 18.00 น.</label>
                                  </div>
                              </div>
                              <div><label className="block text-xs font-bold text-gray-700 mb-1">หมายเหตุ (Note)</label><input value={medcardForm.note} onChange={e => setMedcardForm({...medcardForm, note: e.target.value})} className="w-full border border-red-200 p-2.5 rounded-xl text-sm font-black text-red-600 focus:ring-2 focus:ring-purple-500 outline-none bg-red-50 placeholder-red-300" placeholder="ข้อควรระวังพิเศษ..." /></div>
                          </div>
                      </div>
                  </div>
              </form>
              <div className="p-4 md:p-5 border-t border-gray-200 bg-white flex justify-end gap-3 flex-none">
                 <button type="button" onClick={() => setShowAddModal(false)} className="px-5 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition active:scale-95">ยกเลิก</button>
                 <button type="submit" form="medcard-form" className="px-6 py-3 bg-purple-600 text-white font-bold rounded-xl shadow-md hover:bg-purple-700 transition flex items-center gap-2 active:scale-95"><Save size={18}/> บันทึกข้อมูล MEDcard</button>
              </div>
           </div>
        </div>
      )}

      {/* RETRO MODE MODAL */}
      {showRetroModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4 print:hidden">
              <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200 shadow-2xl">
                 <div className="bg-amber-500 p-4 text-white flex justify-between items-center">
                     <h3 className="font-black flex items-center gap-2 text-lg"><History size={20}/> ตั้งค่าลงเวลาย้อนหลัง</h3>
                     <button onClick={() => setShowRetroModal(false)} className="hover:bg-white/20 p-1.5 rounded-full"><XCircle size={20}/></button>
                 </div>
                 <div className="p-6 space-y-5 bg-gray-50">
                     <p className="text-sm font-bold text-gray-600 leading-relaxed bg-amber-50 border border-amber-200 p-3 rounded-xl">เมื่อตั้งค่าแล้ว การคลิกช่องเวลาในตารางทั้งหมด จะใช้เวลาที่คุณเลือกนี้ทันที</p>
                     <div>
                         <label className="block text-sm font-black text-gray-700 mb-2">เลือกวันที่ย้อนหลัง</label>
                        <input type="date" value={retroDate || getLocalDateString(new Date())} onChange={e => setRetroDate(e.target.value)} max={getLocalDateString(new Date())} min={getLocalDateString(new Date(new Date().setDate(new Date().getDate() - 1)))} className="w-full bg-white border border-gray-300 p-3 rounded-xl font-black text-gray-800 outline-none focus:ring-2 focus:ring-amber-500" />
                     </div>
                    <div>
                         <label className="block text-sm font-black text-gray-700 mb-2">ระบุเวลาที่ต้องการบันทึก <span className="text-red-500">*</span></label>
                         <input type="time" value={retroTime} onChange={e => setRetroTime(e.target.value)} className="w-full bg-white border border-gray-300 p-3 rounded-xl font-black text-2xl text-center text-amber-700 outline-none focus:ring-2 focus:ring-amber-500" />
                     </div>
                 </div>
                 <div className="p-4 border-t border-gray-200 bg-white flex justify-end gap-3">
                     <button onClick={() => setShowRetroModal(false)} className="px-5 py-2.5 font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition">ยกเลิก</button>
                     <button onClick={() => {
                         if (!retroTime || !retroDate) { showAlert("กรุณาระบุวันที่และเวลาให้ครบถ้วน"); return; }
                         const now = new Date();
                         const selectedDateTime = new Date(`${retroDate}T${retroTime}:00`);
                         if (selectedDateTime > now) { showAlert("ไม่สามารถตั้งเวลาล่วงหน้าในอนาคตได้"); return; }
                         setRetroMode(true); setShowRetroModal(false); showAlert("เปิดโหมดลงเวลาย้อนหลังสำเร็จ");
                     }} className="px-5 py-2.5 font-black text-white bg-amber-500 hover:bg-amber-600 rounded-xl shadow-md transition flex items-center gap-2"><CheckCircle size={18}/> ยืนยัน</button>
                 </div>
              </div>
          </div>
      )}

      {/* EDIT MED MODAL */}
      {editingMed && activeTab !== 'medcard' && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4 print:hidden">
           <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200 shadow-2xl">
              <div className={`${activeTab === 'injection' ? 'bg-red-600' : 'bg-green-600'} p-5 text-white font-black text-xl flex justify-between items-center`}>
                 <span className="flex items-center gap-3"><div className="bg-white/20 p-1.5 rounded-xl"><Pencil size={20}/></div> แก้ไขรายการ</span>
                 <button onClick={() => setEditingMed(null)} className="hover:bg-white/20 p-1.5 rounded-full transition"><XCircle size={24}/></button>
              </div>
              <form onSubmit={handleEditMedSubmit} className="p-6 space-y-5 bg-gray-50">
                 <div>
                   <label className="block text-sm font-black text-gray-700 mb-1.5 ml-1">ชื่อรายการ <span className="text-red-500">*</span></label>
                   <textarea rows="2" required name="name" defaultValue={editingMed.name} className={`w-full bg-white border border-gray-300 px-4 py-3 rounded-xl font-black text-gray-800 text-lg outline-none focus:ring-2 resize-none ${activeTab === 'injection' ? 'focus:ring-red-500' : 'focus:ring-green-500'}`} />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-black text-gray-700 mb-1.5 ml-1">ขนาด/วิธีใช้</label>
                      <input name="detail" defaultValue={editingMed.detail} className={`w-full bg-white border border-gray-300 px-4 py-3 rounded-xl font-bold text-gray-800 outline-none focus:ring-2 ${activeTab === 'injection' ? 'focus:ring-red-500' : 'focus:ring-green-500'}`} />
                    </div>
                    <div>
                      <label className="block text-sm font-black text-gray-700 mb-1.5 ml-1">คำสั่งแพทย์</label>
                      <input name="instruction" defaultValue={editingMed.instruction} className={`w-full bg-white border border-gray-300 px-4 py-3 rounded-xl font-bold text-gray-800 outline-none focus:ring-2 ${activeTab === 'injection' ? 'focus:ring-red-500' : 'focus:ring-green-500'}`} />
                    </div>
                 </div>
                 <div>
                    <label className="block text-sm font-black text-gray-700 mb-1.5 ml-1">เวลา (Times)</label>
                    <input list="common-med-times" name="times" defaultValue={editingMed.times.join(', ')} className={`w-full bg-white border border-gray-300 px-4 py-3 rounded-xl font-bold text-gray-800 outline-none focus:ring-2 ${activeTab === 'injection' ? 'focus:ring-red-500' : 'focus:ring-green-500'}`} placeholder="ex. 6, 12, 18" />
                 </div>
                 <div className="flex justify-between items-center mt-8 pt-5 border-t border-gray-300">
                    <button type="button" onClick={handleDeleteClick} className="px-4 py-2.5 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 border border-red-200 flex items-center gap-2 transition shadow-sm"><Trash2 size={18}/> ลบทิ้ง</button>
                    <div className="flex gap-3">
                        <button type="button" onClick={() => setEditingMed(null)} className="px-5 py-2.5 bg-white border border-gray-300 rounded-xl text-gray-700 font-bold hover:bg-gray-100 shadow-sm transition">ยกเลิก</button>
                        <button type="submit" className={`px-6 py-2.5 text-white rounded-xl font-bold shadow-md flex items-center gap-2 transition active:scale-95 ${activeTab === 'injection' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}><Save size={18}/> บันทึกการแก้ไข</button>
                    </div>
                 </div>
              </form>
           </div>
        </div>
      )}

      {showEditPatientModal && (
        <EditPatientModal patient={patient} onUpdate={onUpdatePatient} onDelete={onDeletePatient} onCancel={() => setShowEditPatientModal(false)} />
      )}
      
      {/* DATALISTS */}
      <datalist id="record-list">
          <option value="V/S ทุก 4 ชม." /><option value="V/S, I/O ทุก 8 ชม." /><option value="V/S, N/S ทุก 1 ชม." /><option value="Record I/O" /><option value="Observe clinical อาการแพ้ยา" /><option value="ประเมิน Pain score" />
      </datalist>
      <datalist id="dtx-list">
          <option value="DTX" /><option value="DTX keep 80-150" /><option value="DTX keep 100-180" /><option value="DTX ก่อนอาหาร" />
      </datalist>
      <datalist id="dtx-times">
          <option value="6, 11, 16, 21" /><option value="6, 12, 18, 24" /><option value="6" /><option value="16" /><option value="ac" /><option value="hs" />
      </datalist>
      <datalist id="npo-list">
          <option value="NPO MN for OR" /><option value="NPO MN for LAB" /><option value="NPO for EGD" />
      </datalist>
      <datalist id="lab-list">
          <option value="CBC, BUN, Cr, E'lyte" /><option value="LFT, PT/INR" /><option value="UA, UC" /><option value="H/C x 2 spec" />
      </datalist>
      <datalist id="xray-list">
          <option value="CXR upright" /><option value="KUB" /><option value="Film acute abdomen" />
      </datalist>
      <datalist id="wound-list">
          <option value="Dry dressing" /><option value="Wet dressing" /><option value="Topical ATB dressing" /><option value="Paint Betadine" />
      </datalist>
      <datalist id="mednb-list">
          <option value="NB: Berodual 1 sig" /><option value="NB: Ventolin 1 sig" /><option value="NB: Pulmicort 1 sig" /><option value="NB: NSS 3 ml" />
      </datalist>
      <datalist id="consult-list">
          <option value="Consult Med" /><option value="Consult Sx" /><option value="Consult Ortho" /><option value="Consult PT" /><option value="Consult Nutrition" />
      </datalist>
      <datalist id="diet-list">
          <option value="BD (Bland Diet)" /><option value="LD (Liquid Diet)" /><option value="SD (Soft Diet)" /><option value="Regular Diet" /><option value="DM Diet" /><option value="Low Salt Diet" />
      </datalist>
    </div>
  );
}

// --- HIDDEN PRINT TEMPLATE ---
function PrintTemplate({ id, title, patient, meds, logs, dateRange }) {
  const printSortedMeds = [...meds].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  return (
    <div id={id} style={{ width: '100%', backgroundColor: '#fff', padding: '16px', boxSizing: 'border-box', fontFamily: "'Sarabun', sans-serif" }}>
      <div style={{ borderBottom: '2px solid #000', marginBottom: '16px', paddingBottom: '12px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 'bold', textAlign: 'center', margin: '0 0 10px 0', color: '#000' }}>{title}</h1>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', border: '1px solid #000', padding: '10px', borderRadius: '4px', backgroundColor: '#f9fafb' }}>
           <div style={{ color: '#000' }}>
              <div style={{ fontSize: '14px', marginBottom: '4px' }}><b>ชื่อ:</b> {patient.name}</div>
              <div style={{ fontSize: '14px', marginBottom: '4px' }}><b>HN:</b> {padHN(patient.hn)}  <b style={{marginLeft: '10px'}}>AN:</b> {patient.an}</div>
              <div style={{ fontSize: '14px' }}><b>เตียง:</b> {patient.bed} <b style={{marginLeft: '10px'}}>ตึก:</b> {patient.ward}</div>
           </div>
           <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#b91c1c', border: '1px solid #b91c1c', padding: '4px 8px', display: 'inline-block', borderRadius: '4px', backgroundColor: '#fff' }}>แพ้ยา: {patient.allergies}</div>
           </div>
        </div>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', fontSize: '12px', color: '#000' }}>
        <thead style={{ backgroundColor: '#e5e7eb' }}>
          <tr>
            <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', width: '30px', fontWeight: 'bold' }}>#</th>
            <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'left', fontWeight: 'bold' }}>รายการยา</th>
            <th style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', width: '50px', fontWeight: 'bold' }}>เวลา</th>
            {dateRange.map((d, i) => (
              <th key={i} style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', width: '70px', fontWeight: 'bold' }}>{`${d.getDate()}/${d.getMonth()+1}`}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {printSortedMeds.map((med, idx) => (
            <React.Fragment key={med.id}>
              {med.times.length > 0 ? (
                med.times.map((t, tIdx) => (
                  <tr key={`${med.id}-${t}`}>
                    {tIdx === 0 && <td rowSpan={med.times.length} style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', verticalAlign: 'top' }}>{idx+1}</td>}
                    {tIdx === 0 && (
                      <td rowSpan={med.times.length} style={{ border: '1px solid #000', padding: '6px', verticalAlign: 'top' }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>
                          {med.status === 'off' && <span style={{ color: '#dc2626', marginRight: '4px' }}>[OFF]</span>}
                          <span style={med.status === 'off' ? { textDecoration: 'line-through', color: '#6b7280' } : {}}>{med.name}</span>
                        </div>
                        <div style={{ fontSize: '11px' }}>{med.detail}</div>
                        <div style={{ fontStyle: 'italic', fontSize: '11px', marginTop: '2px', color: '#4b5563' }}>{med.instruction}</div>
                      </td>
                    )}
                    <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', fontWeight: 'bold' }}>{t}:00</td>
                    {dateRange.map((date, i) => {
                      const dateKey = date.toISOString().split('T')[0];
                      const log = logs.find(l => l.medId === med.id && l.dateKey === dateKey && parseInt(l.timestamp) === t);
                      return (
                        <td key={i} style={{ border: '1px solid #000', padding: '4px', textAlign: 'center', verticalAlign: 'middle' }}>
                          {log ? (log.status === 'given' ? <div style={{ color: '#166534', lineHeight: '1.2' }}><span style={{ fontWeight: 'bold', fontSize: '11px' }}>{log.realTime}</span><br/><span style={{ fontSize: '9px' }}>{log.user}</span></div> : <div style={{ color: '#dc2626', fontWeight: 'bold', fontSize: '11px' }}>HOLD</div>) : '-'}
                        </td>
                      );
                    })}
                  </tr>
                ))
              ) : (
                <tr>
                  <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', verticalAlign: 'top' }}>{idx+1}</td>
                  <td style={{ border: '1px solid #000', padding: '6px', verticalAlign: 'top' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '2px' }}><span style={med.status === 'off' ? { textDecoration: 'line-through' } : {}}>{med.name}</span></div>
                    <div style={{ fontSize: '11px' }}>{med.detail}</div>
                  </td>
                  <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', fontStyle: 'italic' }}>PRN</td>
                  {dateRange.map((date, i) => {
                    const dateKey = date.toISOString().split('T')[0];
                    const prnLogs = logs.filter(l => l.medId === med.id && l.dateKey === dateKey);
                    return (
                      <td key={i} style={{ border: '1px solid #000', padding: '4px', textAlign: 'center', verticalAlign: 'top' }}>
                        {prnLogs.map(l => (
                          <div key={l.id} style={{ fontSize: '9px', borderBottom: '1px solid #e5e7eb', marginBottom: '2px', paddingBottom: '2px', lineHeight: '1.2' }}>
                            <span style={{ fontWeight: 'bold', color: l.status==='given'?'#166534':'#dc2626' }}>{l.status==='given' ? l.realTime : 'HOLD'}</span><br/>
                            <span>{l.user}</span>
                          </div>
                        ))}
                      </td>
                    );
                  })}
                </tr>
              )}
            </React.Fragment>
          ))}
          {meds.length === 0 && <tr><td colSpan={8} style={{ border: '1px solid #000', padding: '10px', textAlign: 'center', fontStyle: 'italic', color: '#6b7280' }}>ไม่มีรายการยา</td></tr>}
        </tbody>
      </table>
      <div style={{ marginTop: '10px', textAlign: 'right', fontSize: '11px', color: '#6b7280' }}>พิมพ์เมื่อ: {new Date().toLocaleString('th-TH')}</div>
    </div>
  );
}

// --- BED MAP VIEW ---
function BedMapView({ patients, meds, logs, onSelectPatient, onAdmitToBed }) {
  const WARD_BEDS = [
    ...Array.from({length: 20}, (_, i) => (i + 1).toString().padStart(2, '0')),
    'พ.1', 'พ.2', 'พ.3', 'พ.4', 'พ.5', 'พ.6', 'พ.7', 'พ.8', 'พ.9', 'พ10',
    'ส.1', 'ส.2', 'ส.3', 'ส.4', 'ส.5'
  ];

  const HAD_KEYWORDS = ['insulin', 'heparin', 'warfarin', 'digoxin', 'kcl', 'potassium', 'morphine', 'fentanyl', 'adrenaline', 'norepinephrine', 'dopamine', 'amiodarone'];
  const hadPatientIds = new Set();
  meds.forEach(m => {
      if (m.status === 'active' && (m.isHAD || HAD_KEYWORDS.some(k => m.name.toLowerCase().includes(k)))) {
          const p = patients.find(pat => pat.id === m.patientId);
          if (p) hadPatientIds.add(m.patientId);
      }
  });
  const hadCount = hadPatientIds.size;

  const currentHour = new Date().getHours();
  let upcomingHours = [];
  let tomorrowHours = [];
  meds.forEach(m => {
      if ((m.type === 'injection' || m.type === 'medcard') && m.status === 'active') {
           const p = patients.find(pat => pat.id === m.patientId);
           if(p) {
               const times = Array.isArray(m.times) ? m.times : (typeof m.times === 'string' ? m.times.split(',').map(Number) : [m.times]);
               times.forEach(t => {
                   if (!isNaN(t)) { if (t > currentHour) upcomingHours.push(t); tomorrowHours.push(t); }
               });
           }
      }
  });

  let nextInjHour = null;
  let nextInjCount = 0;
  if (upcomingHours.length > 0) { nextInjHour = Math.min(...upcomingHours); nextInjCount = upcomingHours.filter(h => h === nextInjHour).length; }
  else if (tomorrowHours.length > 0) { nextInjHour = Math.min(...tomorrowHours); nextInjCount = tomorrowHours.filter(h => h === nextInjHour).length; }

  const formatNextTime = nextInjHour !== null ? `${nextInjHour.toString().padStart(2, '0')}.00 น.` : '-';
  const reminderHours = [currentHour - 1, currentHour, currentHour + 1].filter(h => h >= 0 && h <= 23);
  const reminderText = `${reminderHours.map(h => `${h.toString().padStart(2, '0')}.00`).join(', ')}`;

  return (
    <div className="flex-1 overflow-y-auto bg-transparent p-4 md:p-8 animate-in fade-in duration-500">
      <div className="max-w-7xl mx-auto space-y-8 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-white/40 pb-5">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-gray-800 tracking-tight drop-shadow-sm">Ward Dashboard</h1>
            <p className="text-gray-600 font-bold mt-2 text-sm md:text-base bg-white/40 inline-block px-3 py-1 rounded-lg backdrop-blur-sm border border-white/50 shadow-sm">แผนผังเตียง และภาพรวมการให้ยาประจำวอร์ด</p>
          </div>
          <div className="flex items-center gap-2 bg-white/60 backdrop-blur-md px-5 py-2.5 rounded-2xl text-sm font-black text-gray-800 border border-white/80 shadow-sm">
             <Clock className="text-blue-600 drop-shadow-sm" size={20}/> เวลาปัจจุบัน: <span className="text-lg bg-white/80 px-2 rounded-md border border-white">{new Date().toLocaleTimeString('th-TH', {hour: '2-digit', minute:'2-digit'})}</span> น.
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <div className="bg-white/60 backdrop-blur-md rounded-3xl p-6 flex flex-col justify-between border border-white/80 shadow-sm">
             <div className="flex items-center gap-3 mb-4"><div className="bg-gradient-to-br from-blue-400 to-blue-600 p-3.5 rounded-2xl text-white shadow-lg shadow-blue-500/30"><Users size={24}/></div><div className="text-sm font-black text-gray-600 tracking-wide">ผู้ป่วย Admit ทั้งหมด</div></div>
             <div className="flex items-end gap-2"><span className="text-5xl md:text-6xl font-black text-gray-800 leading-none">{patients.length}</span><span className="text-gray-600 font-bold mb-1.5 text-lg">ราย</span></div>
          </div>
          <div className="bg-white/60 backdrop-blur-md rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden group border border-white/80 shadow-sm">
             <div className="absolute top-0 right-0 w-32 h-32 bg-red-400/20 rounded-bl-full -z-0 transition-transform group-hover:scale-110"></div>
             <div className="flex items-center gap-3 mb-4 relative z-10"><div className="bg-gradient-to-br from-red-400 to-red-600 p-3.5 rounded-2xl text-white shadow-lg shadow-red-500/30"><ShieldAlert size={24}/></div><div className="text-sm font-black text-gray-600 tracking-wide">ผู้ป่วยได้รับยา HAD</div></div>
             <div className="flex items-end gap-2 relative z-10"><span className="text-5xl md:text-6xl font-black text-red-600 leading-none">{hadCount}</span><span className="text-red-700 font-bold mb-1.5 text-lg">ราย</span></div>
          </div>
          <div className="bg-white/60 backdrop-blur-md rounded-3xl p-6 flex flex-col justify-between border border-white/80 shadow-sm">
             <div className="flex items-center gap-3 mb-4"><div className="bg-gradient-to-br from-indigo-400 to-purple-600 p-3.5 rounded-2xl text-white shadow-lg shadow-indigo-500/30"><ActivitySquare size={24}/></div><div className="text-sm font-black text-gray-600 tracking-wide">เวลาฉีด/รักษา รอบถัดไป</div></div>
             <div className="flex flex-col"><div className="text-3xl font-black text-indigo-800 bg-white/50 inline-block px-3 py-1 rounded-xl border border-white/60 self-start">{formatNextTime}</div><div className="text-sm text-gray-600 font-bold mt-3">จำนวน <span className="font-black text-lg text-indigo-700 bg-indigo-100/50 px-2 rounded-lg">{nextInjCount}</span> รายการ</div></div>
          </div>
          <div className="bg-gradient-to-br from-amber-50/60 to-orange-50/60 backdrop-blur-md rounded-3xl p-6 flex flex-col justify-between border border-amber-200/50 shadow-sm">
             <div className="flex items-center gap-3 mb-4"><div className="bg-gradient-to-br from-amber-400 to-orange-500 p-3.5 rounded-2xl text-white shadow-lg shadow-amber-500/40 animate-pulse"><Bell size={24}/></div><div className="text-sm font-black text-amber-900 tracking-wide">แจ้งเตือน (Action Time)</div></div>
             <div className="text-sm text-amber-900 font-bold leading-relaxed bg-white/40 p-3 rounded-xl border border-white/50 shadow-inner">กรุณาลงชื่อให้ยา/การรักษา เวลา <span className="font-black text-base bg-amber-200/80 px-2 rounded-md shadow-sm">{reminderText}</span> ที่ใกล้ถึง</div>
          </div>
        </div>

        <div className="bg-white/50 backdrop-blur-xl rounded-[2rem] p-4 md:p-8 border border-white/80 shadow-sm">
           <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8 gap-3 md:gap-5">
              {WARD_BEDS.map(bedNum => {
                 const patient = patients.find(p => p.bed === bedNum);
                 const isHAD = hadPatientIds.has(patient?.id);
                 if (patient) {
                    return (
                       <div key={bedNum} onClick={() => onSelectPatient(patient.id)} className="bg-white/80 backdrop-blur-md hover:bg-white rounded-2xl p-4 cursor-pointer transition-all shadow-sm hover:shadow-md hover:-translate-y-1 relative flex flex-col min-h-[100px] md:min-h-[130px] border border-white border-l-4 border-l-blue-500">
                          <div className="flex justify-between items-start mb-2 md:mb-3">
                             <span className="text-2xl md:text-3xl font-black text-gray-800">{bedNum}</span>
                             <div className="flex gap-1">
                               {isHAD && <span className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow-sm"><ShieldAlert size={12}/></span>}
                               {patient.allergies && patient.allergies !== '-' && <span className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-sm"><AlertOctagon size={12}/></span>}
                             </div>
                          </div>
                          <div className="mt-auto">
                             <div className="font-black text-gray-800 text-[13px] md:text-[15px] leading-tight line-clamp-2">{patient.name}</div>
                             <div className="text-[10px] md:text-xs text-gray-600 mt-1 md:mt-1.5 font-bold bg-white/80 inline-block px-2 py-0.5 rounded-lg border border-gray-100">HN: {padHN(patient.hn)}</div>
                          </div>
                       </div>
                    );
                 } else {
                    return (
                       <div key={bedNum} onClick={() => onAdmitToBed(bedNum)} className="rounded-2xl p-4 cursor-pointer transition-all flex flex-col items-center justify-center min-h-[100px] md:min-h-[130px] group border-2 border-dashed border-gray-300 bg-white/20 hover:bg-white/50 backdrop-blur-sm hover:border-blue-400">
                          <span className="text-2xl md:text-4xl font-black text-gray-400/50 group-hover:text-blue-500/70 transition-colors mb-2 md:mb-3">{bedNum}</span>
                          <span className="text-[10px] md:text-xs font-black text-gray-500 group-hover:text-blue-700 flex items-center gap-1 bg-white/60 backdrop-blur-md px-3 py-1 md:py-1.5 rounded-full shadow-sm border border-white transition-all"><Plus size={12}/> ว่าง</span>
                       </div>
                    );
                 }
              })}
           </div>
        </div>
      </div>
    </div>
  );
}

// --- SUB-COMPONENTS ---
function TabButton({ active, onClick, icon, label, color }) {
  let activeClass = '';
  if (color === 'green') activeClass = 'bg-white text-green-700 border-white shadow-[0_-4px_10px_rgba(0,0,0,0.05)] backdrop-blur-xl';
  else if (color === 'red') activeClass = 'bg-white text-red-700 border-white shadow-[0_-4px_10px_rgba(0,0,0,0.05)] backdrop-blur-xl';
  else if (color === 'purple') activeClass = 'bg-white text-purple-700 border-white shadow-[0_-4px_10px_rgba(0,0,0,0.05)] backdrop-blur-xl';
  return (
    <button onClick={onClick} className={`px-4 py-2.5 md:px-5 md:py-3 rounded-t-2xl font-black flex items-center gap-2 text-xs md:text-sm transition-all relative top-[1px] whitespace-nowrap border-t border-x ${active ? `${activeClass} z-10 scale-105 origin-bottom` : 'bg-white/40 border-white/40 text-gray-600 hover:bg-white/60 backdrop-blur-md'}`}>
      {icon} {label}
    </button>
  );
}

function NewPatientForm({ initialBed = '', onAdd, onAddMultiple, onCancel, showAlert, activePatients }) {
  const [formData, setFormData] = useState({ bed: initialBed, hn: '', name: '', an: '', ward: 'ผู้ป่วยในชาย', allergies: '', diagnosis: '', doctor: '' });
  const [isFetching, setIsFetching] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);

  useEffect(() => { setFormData(prev => ({ ...prev, bed: initialBed })); }, [initialBed]);
  const handleChange = (e) => { setFormData({ ...formData, [e.target.name]: e.target.value }); };

  const handleSyncAll = async () => {
    setIsSyncingAll(true);
    try {
        const sheetId = "1t0xSegQ7aXqDixeMh5kRbrrQOh_T30d7qbKeNqFhzvQ";
        const gid = "0"; 
        const sheetCsvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}&t=${new Date().getTime()}`;
        const response = await fetch(sheetCsvUrl);
        if (!response.ok) throw new Error("ไม่สามารถดาวน์โหลดข้อมูลได้ (รหัส " + response.status + ")");
        const csvText = await response.text();
        if (csvText.trim().toLowerCase().startsWith('<!doctype html>') || csvText.toLowerCase().includes('<html')) throw new Error("ไฟล์ติดสิทธิ์การเข้าถึง");
        const rows = parseCSVData(csvText);
        
        const sheetPatients = [];
        for (let i = 1; i < rows.length; i++) {
            const cols = rows[i];
            if (!cols || cols.length < 3) continue;
            let hn = (cols[26] || '').trim();
            if (!hn) continue;
            hn = padHN(hn);
            
            const bedA = (cols[0] || '').trim();
            const bedB = (cols[1] || '').trim();
            let bed = bedB && bedB.length <= 5 ? bedB : (bedA && bedA.length <= 5 ? bedA : '');
            if (/^\d$/.test(bed)) bed = '0' + bed;
            
            if (hn && bed) {
                sheetPatients.push({ 
                    hn, an: (cols[2] || '').trim(), name: (cols[3] || '').trim(), 
                    bed, ward: "ผู้ป่วยในชาย", allergies: '-', 
                    diagnosis: (cols[4] || '').trim(), doctor: (cols[25] || '').trim() 
                });
            }
        }

        const batch = writeBatch(db);
        const todayStr = new Date().toLocaleDateString('th-TH');
        let addedCount = 0;
        let updatedCount = 0;
        let dischargedCount = 0;

        const sheetHnMap = new Map(sheetPatients.map(p => [p.hn, p]));
        const activeDbPatients = activePatients;

        activeDbPatients.forEach(dbPat => {
            const dbHn = padHN(dbPat.hn);
            const sheetMatch = sheetHnMap.get(dbHn);
            
            if (!sheetMatch) {
                const docRef = doc(getColl('patients'), dbPat.id);
                batch.update(docRef, { status: 'discharged', dischargeDate: todayStr });
                dischargedCount++;
            } else {
                if (dbPat.bed !== sheetMatch.bed || dbPat.name !== sheetMatch.name || dbPat.diagnosis !== sheetMatch.diagnosis) {
                    const docRef = doc(getColl('patients'), dbPat.id);
                    batch.update(docRef, { bed: sheetMatch.bed, name: sheetMatch.name, diagnosis: sheetMatch.diagnosis });
                    updatedCount++;
                }
                sheetHnMap.delete(dbHn);
            }
        });

        sheetHnMap.forEach(newPat => {
            const docRef = doc(getColl('patients'));
            batch.set(docRef, { ...newPat, hospital: "โรงพยาบาลคอนสาร", status: "admitted", createdAt: new Date().toISOString() });
            addedCount++;
        });

        await batch.commit();
        if(showAlert) showAlert(`ซิงค์ข้อมูลสำเร็จ: เพิ่มใหม่ ${addedCount} | อัปเดตเตียง ${updatedCount} | จำหน่าย ${dischargedCount}`);
    } catch (error) {
        console.error("Sync error:", error);
        if(showAlert) showAlert("เกิดข้อผิดพลาดในการซิงค์: " + error.message);
    } finally { setIsSyncingAll(false); }
  };

  const handleFetchPatientData = async () => {
    let searchBed = formData.bed.trim(); 
    if (!searchBed) { if(showAlert) showAlert("กรุณากรอกเลขเตียงก่อนกดค้นหา"); return; }
    if (/^\d$/.test(searchBed)) searchBed = '0' + searchBed;
    setIsFetching(true);
    try {
        const sheetId = "1t0xSegQ7aXqDixeMh5kRbrrQOh_T30d7qbKeNqFhzvQ";
        const gid = "0"; 
        const sheetCsvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}&t=${new Date().getTime()}`;
        const response = await fetch(sheetCsvUrl);
        if (!response.ok) throw new Error("ไม่สามารถดาวน์โหลดข้อมูลได้ (รหัส " + response.status + ")");
        const csvText = await response.text();
        if (csvText.trim().toLowerCase().startsWith('<!doctype html>') || csvText.toLowerCase().includes('<html')) throw new Error("ไฟล์ติดสิทธิ์การเข้าถึง");
        const rows = parseCSVData(csvText);
        let foundData = null;
        for (let i = 1; i < rows.length; i++) {
            const cols = rows[i];
            if (!cols || cols.length < 3) continue;
            const sheetBedA = (cols[0] || '').trim();
            const sheetBedB = (cols[1] || '').trim();
            let parsedBed = '';
            if (sheetBedB && sheetBedB.length <= 5) parsedBed = sheetBedB;
            else if (sheetBedA && sheetBedA.length <= 5) parsedBed = sheetBedA;
            if (/^\d$/.test(parsedBed)) parsedBed = '0' + parsedBed;
            if (parsedBed === searchBed || sheetBedA === searchBed || sheetBedB === searchBed) {
                foundData = { an: (cols[2] || '').trim(), name: (cols[3] || '').trim(), diagnosis: (cols[4] || '').trim(), doctor: (cols[25] || '').trim(), hn: padHN((cols[26] || '').trim()) };
                break;
            }
        }
        if (foundData) { setFormData(prev => ({ ...prev, ...foundData })); if(showAlert) showAlert("ดึงข้อมูลผู้ป่วยสำเร็จ"); }
        else if(showAlert) showAlert(`ไม่พบข้อมูลเลขเตียง: ${searchBed} ในฐานข้อมูล`);
    } catch (error) {
        console.error("Fetch error:", error);
        if(showAlert) showAlert("แจ้งเตือน: " + error.message);
    } finally { setIsFetching(false); }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onAdd({ hn: padHN(formData.hn), an: formData.an, name: formData.name, bed: formData.bed, ward: formData.ward, allergies: formData.allergies || '-', diagnosis: formData.diagnosis || '', doctor: formData.doctor || '', hospital: "โรงพยาบาลคอนสาร", status: "admitted" });
    onCancel();
  };

  return (
    <div className="flex-1 flex items-center justify-center bg-transparent p-4 overflow-y-auto relative z-10">
       <div className="bg-white/90 backdrop-blur-md border border-white shadow-xl w-full max-w-xl p-8 rounded-[2rem] animate-in zoom-in duration-300 my-auto">
          <h2 className="text-3xl font-black mb-8 text-gray-800 flex items-center gap-4 border-b border-gray-200 pb-5">
            <div className="bg-blue-100 text-blue-600 p-3 rounded-2xl"><UserPlus size={28}/></div> 
            รับผู้ป่วยใหม่ (Admit)
          </h2>
          <div className="mb-6">
              <button type="button" onClick={handleSyncAll} disabled={isSyncingAll} className="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white p-4 rounded-3xl font-black shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-70 disabled:transform-none">
                  {isSyncingAll ? <RefreshCw className="animate-spin" size={26}/> : <Cloud size={26}/>}
                  <span className="text-lg md:text-xl">ดึงข้อมูลผู้ป่วยใหม่ทั้งหมด (Sync All)</span>
              </button>
              <div className="flex items-center my-6 text-gray-400 font-bold text-sm"><div className="flex-1 border-t border-gray-200"></div><span className="px-4">หรือ ดึงรายบุคคลด้วยเลขเตียง</span><div className="flex-1 border-t border-gray-200"></div></div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
             <div className="bg-blue-50 p-5 rounded-3xl border border-blue-100 shadow-sm">
                <label className="block text-sm font-black text-blue-900 mb-3 ml-1">ดึงข้อมูลจากฐานข้อมูล (ด้วยเลขเตียง)</label>
                <div className="flex gap-3">
                    <input required name="bed" value={formData.bed} onChange={handleChange} className="flex-1 bg-white border border-blue-200 p-4 rounded-2xl text-center text-xl font-black text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500" placeholder="ระบุเลขเตียง" />
                    <button type="button" onClick={handleFetchPatientData} disabled={isFetching} className="bg-blue-600 text-white px-6 rounded-2xl font-bold shadow-md hover:bg-blue-700 transition active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70">
                        {isFetching ? <RefreshCw className="animate-spin" size={22}/> : <Search size={22}/>}
                        <span className="hidden sm:inline text-base">ค้นหา</span>
                    </button>
                </div>
             </div>
             <div className="grid grid-cols-2 gap-5 mt-2">
                <div><label className="block text-sm font-black text-gray-700 mb-1.5 ml-1">HN <span className="text-red-500">*</span></label><input required name="hn" value={formData.hn} onChange={handleChange} className="w-full bg-gray-50 border border-gray-200 p-3.5 rounded-xl outline-none font-bold text-gray-800 text-lg focus:ring-2 focus:ring-blue-500"/></div>
                <div><label className="block text-sm font-black text-gray-700 mb-1.5 ml-1">AN</label><input name="an" value={formData.an} onChange={handleChange} className="w-full bg-gray-50 border border-gray-200 p-3.5 rounded-xl outline-none font-bold text-gray-800 text-lg focus:ring-2 focus:ring-blue-500"/></div>
             </div>
             <div><label className="block text-sm font-black text-gray-700 mb-1.5 ml-1">ชื่อ-นามสกุล <span className="text-red-500">*</span></label><input required name="name" value={formData.name} onChange={handleChange} className="w-full bg-gray-50 border border-gray-200 p-3.5 rounded-xl outline-none text-xl font-black text-gray-800 focus:ring-2 focus:ring-blue-500"/></div>
             <div className="grid grid-cols-2 gap-5">
                 <div><label className="block text-sm font-black text-gray-700 mb-1.5 ml-1">Diagnosis</label><input name="diagnosis" value={formData.diagnosis} onChange={handleChange} className="w-full bg-gray-50 border border-gray-200 p-3.5 rounded-xl outline-none font-bold text-gray-800 focus:ring-2 focus:ring-blue-500" placeholder="#ระบุโรค..."/></div>
                 <div><label className="block text-sm font-black text-gray-700 mb-1.5 ml-1">แพทย์เจ้าของไข้</label><input name="doctor" value={formData.doctor} onChange={handleChange} className="w-full bg-gray-50 border border-gray-200 p-3.5 rounded-xl outline-none font-bold text-gray-800 focus:ring-2 focus:ring-blue-500" placeholder="ชื่อแพทย์"/></div>
             </div>
             <div className="grid grid-cols-2 gap-5">
                 <div><label className="block text-sm font-black text-gray-700 mb-1.5 ml-1">ตึก/Ward</label><input name="ward" value={formData.ward} onChange={handleChange} className="w-full bg-gray-50 border border-gray-200 p-3.5 rounded-xl outline-none font-bold text-gray-800 focus:ring-2 focus:ring-blue-500"/></div>
                 <div><label className="block text-sm font-black text-red-700 mb-1.5 ml-1">ประวัติแพ้ยา</label><input name="allergies" value={formData.allergies} onChange={handleChange} className="w-full bg-red-50 border border-red-200 p-3.5 rounded-xl placeholder-red-300 text-red-800 focus:ring-2 focus:ring-red-400 outline-none font-black" placeholder="ระบุยา (ถ้าไม่มีเว้นว่าง)"/></div>
             </div>
              <div className="flex gap-4 pt-6 border-t border-gray-200">
                <button type="button" onClick={onCancel} className="flex-1 bg-white border border-gray-300 hover:bg-gray-50 py-4 rounded-2xl text-gray-700 font-black text-lg transition shadow-sm">ยกเลิก</button>
                <button type="submit" className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black shadow-md transition flex items-center justify-center gap-2 text-lg active:scale-95"><CheckCircle size={24}/> บันทึกรับผู้ป่วย</button>
             </div>
          </form>
       </div>
    </div>
  );
}

function EditPatientModal({ patient, onUpdate, onDelete, onCancel }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const newStatus = fd.get('status');
    let dischargeDate = patient.dischargeDate;
    if (newStatus === 'discharged' && patient.status !== 'discharged') dischargeDate = new Date().toLocaleDateString('th-TH');
    else if (newStatus === 'admitted') dischargeDate = null;
    onUpdate(patient.id, { hn: padHN(fd.get('hn')), an: fd.get('an'), name: fd.get('name'), bed: fd.get('bed'), ward: fd.get('ward'), allergies: fd.get('allergies') || '-', diagnosis: fd.get('diagnosis') || '', doctor: fd.get('doctor') || '', status: newStatus, dischargeDate });
    onCancel();
  };
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4 print:hidden">
       <div className="bg-white rounded-3xl w-full max-w-xl p-8 animate-in fade-in zoom-in duration-300 max-h-[90vh] overflow-y-auto no-scrollbar shadow-2xl">
          <div className="flex justify-between items-center border-b border-gray-200 pb-5 mb-6"><h2 className="text-2xl font-black text-gray-800 flex items-center gap-3"><div className="bg-blue-50 p-2 rounded-xl border border-blue-100"><Edit3 className="text-blue-600"/></div> แก้ไขข้อมูลผู้ป่วย</h2><button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-full transition"><XCircle size={24}/></button></div>
          <form onSubmit={handleSubmit} className="space-y-5">
             <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 shadow-sm">
                <label className="block text-sm font-black text-blue-900 mb-2 ml-1">สถานะผู้ป่วย (Status)</label>
                <select name="status" defaultValue={patient.status} className="w-full bg-white border border-blue-200 p-3 rounded-xl outline-none text-blue-900 font-black text-lg focus:ring-2 focus:ring-blue-500">
                    <option value="admitted">ผู้ป่วยปัจจุบัน (Admitted)</option>
                    <option value="discharged">จำหน่ายแล้ว (Discharged)</option>
                </select>
             </div>
             <div className="grid grid-cols-3 gap-5">
                <div className="col-span-1"><label className="block text-sm font-black text-gray-700 mb-1.5 ml-1">เลขเตียง</label><input required name="bed" defaultValue={patient.bed} className="w-full bg-gray-50 border border-gray-200 p-3.5 rounded-xl outline-none font-bold text-gray-800 text-center text-lg focus:ring-2 focus:ring-blue-500"/></div>
                <div className="col-span-2"><label className="block text-sm font-black text-gray-700 mb-1.5 ml-1">HN</label><input required name="hn" defaultValue={padHN(patient.hn)} className="w-full bg-gray-50 border border-gray-200 p-3.5 rounded-xl outline-none font-bold text-gray-800 text-lg focus:ring-2 focus:ring-blue-500"/></div>
             </div>
             <div><label className="block text-sm font-black text-gray-700 mb-1.5 ml-1">ชื่อ-นามสกุล</label><input required name="name" defaultValue={patient.name} className="w-full bg-gray-50 border border-gray-200 p-3.5 rounded-xl outline-none font-black text-gray-800 text-lg focus:ring-2 focus:ring-blue-500"/></div>
             <div><label className="block text-sm font-black text-gray-700 mb-1.5 ml-1">Diagnosis</label><input name="diagnosis" defaultValue={patient.diagnosis} className="w-full bg-gray-50 border border-gray-200 p-3.5 rounded-xl outline-none font-bold text-gray-800 focus:ring-2 focus:ring-blue-500"/></div>
             <div><label className="block text-sm font-black text-gray-700 mb-1.5 ml-1">แพทย์เจ้าของไข้</label><input name="doctor" defaultValue={patient.doctor} className="w-full bg-gray-50 border border-gray-200 p-3.5 rounded-xl outline-none font-bold text-gray-800 focus:ring-2 focus:ring-blue-500"/></div>
             <div className="grid grid-cols-2 gap-5">
               <div><label className="block text-sm font-black text-gray-700 mb-1.5 ml-1">AN</label><input name="an" defaultValue={patient.an} className="w-full bg-gray-50 border border-gray-200 p-3.5 rounded-xl outline-none font-bold text-gray-800 focus:ring-2 focus:ring-blue-500"/></div>
               <div><label className="block text-sm font-black text-gray-700 mb-1.5 ml-1">ตึก/Ward</label><input name="ward" defaultValue={patient.ward} className="w-full bg-gray-50 border border-gray-200 p-3.5 rounded-xl outline-none font-bold text-gray-800 focus:ring-2 focus:ring-blue-500"/></div>
             </div>
             <div><label className="block text-sm font-black text-red-700 mb-1.5 ml-1">ประวัติแพ้ยา (Allergies)</label><input name="allergies" defaultValue={patient.allergies === '-' ? '' : patient.allergies} className="w-full bg-red-50 border border-red-200 p-3.5 rounded-xl placeholder-red-300 text-red-800 focus:ring-2 focus:ring-red-400 outline-none font-black" placeholder="ระบุชื่อยา (ถ้าไม่มีเว้นว่าง)"/></div>
             <div className="flex justify-between gap-3 pt-8 border-t border-gray-200">
                <button type="button" onClick={() => { onCancel(); onDelete(); }} className="bg-red-50 text-red-600 border border-red-200 px-4 py-3.5 rounded-xl font-black hover:bg-red-100 transition shadow-sm flex items-center justify-center gap-2" title="ลบข้อมูลผู้ป่วยถาวร">
                    <Trash2 size={24}/>
                </button>
                <div className="flex flex-1 gap-3">
                    <button type="button" onClick={onCancel} className="flex-1 bg-white border border-gray-300 py-3.5 rounded-xl text-gray-700 font-black text-lg hover:bg-gray-50 transition shadow-sm">ยกเลิก</button>
                    <button type="submit" className="flex-[1.5] bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-black shadow-md transition text-lg active:scale-95">บันทึกข้อมูล</button>
                </div>
             </div>
          </form>
       </div>
    </div>
  );
}
