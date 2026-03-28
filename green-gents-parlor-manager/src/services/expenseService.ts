import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  doc,
  setDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ExpenseRecord } from '../types';

const EXPENSE_COLLECTION = 'expenses';

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

export const addExpense = async (amount: number, date: string, notes: string = '', category: string = 'General') => {
  try {
    const docRef = await addDoc(collection(db, EXPENSE_COLLECTION), {
      amount,
      date,
      notes,
      category,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, EXPENSE_COLLECTION);
    throw error;
  }
};

export const updateExpense = async (id: string, amount: number, date: string, notes: string = '', category: string = 'General') => {
  try {
    await setDoc(doc(db, EXPENSE_COLLECTION, id), {
      amount,
      date,
      notes,
      category,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${EXPENSE_COLLECTION}/${id}`);
    throw error;
  }
};

export const deleteExpense = async (id: string) => {
  try {
    await deleteDoc(doc(db, EXPENSE_COLLECTION, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${EXPENSE_COLLECTION}/${id}`);
    throw error;
  }
};

export const subscribeToExpenses = (callback: (expenses: ExpenseRecord[]) => void) => {
  const q = query(
    collection(db, EXPENSE_COLLECTION),
    orderBy('date', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const expenses = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as ExpenseRecord));
    callback(expenses);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, EXPENSE_COLLECTION);
  });
};
