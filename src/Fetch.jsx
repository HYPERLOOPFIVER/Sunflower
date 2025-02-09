import { useEffect, useState } from "react";
import { db, collection, query, getDocs } from "./Firebase";

const GlimpseList = () => {
    const [glimpses, setGlimpses] = useState([]);

    useEffect(() => {
        const fetchGlimpses = async () => {
            const q = query(collection(db, "glimpses"));
            const querySnapshot = await getDocs(q);
            const glimpsesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setGlimpses(glimpsesData);
        };

        fetchGlimpses();
    }, []);

    return (
        <div>
            <h2>Recent Glimpses</h2>
            {glimpses.map(glimpse => (
                <div key={glimpse.id}>
                    <img src={glimpse.mediaUrl} alt="Glimpse" width="200" />
                </div>
            ))}
        </div>
    );
};

export default GlimpseList;
