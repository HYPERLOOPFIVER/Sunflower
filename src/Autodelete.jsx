import { db, collection, query, where, getDocs, deleteDoc } from "./Firebase";

const deleteExpiredGlimpses = async () => {
    const q = query(collection(db, "glimpses"), where("expiresAt", "<=", Date.now()));
    const querySnapshot = await getDocs(q);
    
    querySnapshot.forEach(async (doc) => {
        await deleteDoc(doc.ref);
        console.log(`Deleted expired glimpse: ${doc.id}`);
    });
};

export default deleteExpiredGlimpses;
