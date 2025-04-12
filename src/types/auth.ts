export type GuardProps = {
  children: React.ReactElement | null;
};

// Firestoreのユーザーデータ型 (規約同意状態を含む)
export interface UserFirestoreData {
  termsAccepted: boolean;
  createdAt?: any; // Firebase Timestamp (例: serverTimestamp())
}
