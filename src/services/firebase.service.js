import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, updateDoc, doc, getDocs, query, where, deleteDoc, orderBy } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getUserInfo } from 'zmp-sdk/apis';

const firebaseConfig = {
  apiKey: "AIzaSyA2MIOA97V2uAcqqbWbul0aAhRd9Vym6T0",
  authDomain: "dien-ong-can.firebaseapp.com",
  projectId: "dien-ong-can",
  storageBucket: "dien-ong-can.appspot.app",
  messagingSenderId: "289175924554",
  appId: "1:289175924554:web:1f9bdbeaa0eeb6aefe5bb3",
  measurementId: "G-E60R6H024G"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

export const signInAnonymous = async () => {
  try {
    const result = await signInAnonymously(auth);
    console.log("Đăng nhập ẩn danh thành công:", result.user.uid);
    return result.user;
  } catch (error) {
    console.error("Lỗi đăng nhập:", error);
    return null;
  }
};

export const getCurrentZaloUser = async () => {
  try {
    const user = await getUserInfo({ avatarType: "normal" });
    return user.userInfo;
  } catch (error) {
    console.error("Lỗi khi lấy thông tin người dùng Zalo:", error);
    return null;
  }
};

export const getCurrentUserId = async () => {
  const zaloUser = await getCurrentZaloUser();
  if (zaloUser && zaloUser.id) {
    return `zalo_${zaloUser.id}`;
  }
  
  if (auth.currentUser) {
    return `firebase_${auth.currentUser.uid}`;
  }
  
  const anonUser = await signInAnonymous();
  return anonUser ? `firebase_${anonUser.uid}` : null;
};

export const getPeople = async (userId) => {
  try {
    const q = query(
      collection(db, "people"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Lỗi khi lấy danh sách người dùng:", error);
    return [];
  }
};

export const addPerson = async (data) => {
  try {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error("Không thể xác định người dùng");
    
    const personData = {
      ...data,
      userId,
      createdAt: new Date().toISOString()
    };
    
    const docRef = await addDoc(collection(db, "people"), personData);
    return { id: docRef.id, ...personData };
  } catch (error) {
    console.error("Lỗi khi thêm người dùng:", error);
    return null;
  }
};

export const updatePerson = async (id, data) => {
  try {
    await updateDoc(doc(db, "people", id), {
      ...data,
      updatedAt: new Date().toISOString()
    });
    return true;
  } catch (error) {
    console.error("Lỗi khi cập nhật người dùng:", error);
    return false;
  }
};

export const deletePerson = async (id) => {
  try {
    await deleteDoc(doc(db, "people", id));
    return true;
  } catch (error) {
    console.error("Lỗi khi xóa người dùng:", error);
    return false;
  }
};

// CRUD Operations cho Readings
export const getReadings = async (userId) => {
  try {
    const q = query(
      collection(db, "readings"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Lỗi khi lấy danh sách chỉ số điện:", error);
    return [];
  }
};

export const addReading = async (data) => {
  try {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error("Không thể xác định người dùng");
    
    const readingData = {
      ...data,
      userId,
      createdAt: new Date().toISOString()
    };
    
    const docRef = await addDoc(collection(db, "readings"), readingData);
    return { id: docRef.id, ...readingData };
  } catch (error) {
    console.error("Lỗi khi thêm chỉ số điện:", error);
    return null;
  }
};

export const updateReading = async (id, data) => {
  try {
    await updateDoc(doc(db, "readings", id), {
      ...data,
      updatedAt: new Date().toISOString()
    });
    return true;
  } catch (error) {
    console.error("Lỗi khi cập nhật chỉ số điện:", error);
    return false;
  }
};

export const deleteReading = async (id) => {
  try {
    await deleteDoc(doc(db, "readings", id));
    return true;
  } catch (error) {
    console.error("Lỗi khi xóa chỉ số điện:", error);
    return false;
  }
};

// CRUD Operations cho Bills
export const getBills = async (userId) => {
  try {
    const q = query(
      collection(db, "bills"),
      where("userId", "==", userId),
      orderBy("month", "desc")
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Lỗi khi lấy danh sách hóa đơn:", error);
    return [];
  }
};

export const addOrUpdateBill = async (month, billData) => {
  try {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error("Không thể xác định người dùng");
    
    // Check if bill already exists
    const q = query(
      collection(db, "bills"),
      where("userId", "==", userId),
      where("month", "==", month)
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      // Add new bill
      const newBillData = {
        ...billData,
        month,
        userId,
        createdAt: new Date().toISOString()
      };
      
      const docRef = await addDoc(collection(db, "bills"), newBillData);
      return { id: docRef.id, ...newBillData };
    } else {
      // Update existing bill
      const docId = snapshot.docs[0].id;
      await updateDoc(doc(db, "bills", docId), {
        ...billData,
        updatedAt: new Date().toISOString()
      });
      
      return { id: docId, ...billData, month, userId };
    }
  } catch (error) {
    console.error("Lỗi khi cập nhật hóa đơn:", error);
    return null;
  }
};