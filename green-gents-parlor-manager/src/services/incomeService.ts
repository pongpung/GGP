import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  getDocFromServer,
  doc,
  setDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { IncomeRecord } from '../types';

const INCOME_COLLECTION = 'incomes';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: 'No auth implemented',
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const addIncome = async (amount: number, date: string, notes: string = '') => {
  try {
    const docRef = await addDoc(collection(db, INCOME_COLLECTION), {
      amount,
      date,
      notes,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, INCOME_COLLECTION);
    throw error;
  }
};

export const updateIncome = async (id: string, amount: number, date: string, notes: string = '') => {
  try {
    await setDoc(doc(db, INCOME_COLLECTION, id), {
      amount,
      date,
      notes,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${INCOME_COLLECTION}/${id}`);
    throw error;
  }
};

export const deleteIncome = async (id: string) => {
  try {
    await deleteDoc(doc(db, INCOME_COLLECTION, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${INCOME_COLLECTION}/${id}`);
    throw error;
  }
};

export const subscribeToIncomes = (callback: (incomes: IncomeRecord[]) => void) => {
  const q = query(
    collection(db, INCOME_COLLECTION),
    orderBy('date', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const incomes = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as IncomeRecord));
    callback(incomes);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, INCOME_COLLECTION);
  });
};

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. ");
    }
  }
}
testConnection();
