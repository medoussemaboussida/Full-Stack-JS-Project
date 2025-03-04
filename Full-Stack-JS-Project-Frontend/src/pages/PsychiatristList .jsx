import React, { useEffect, useState } from 'react';
import axios from 'axios';

const PsychiatristList = () => {
    const [psychiatrists, setPsychiatrists] = useState([]);

    useEffect(() => {
        axios.get('http://localhost:5000/users/psychiatrists')
            .then(response => {
                setPsychiatrists(response.data);
            })
            .catch(error => {
                console.error('Error fetching psychiatrists:', error);
            });
    }, []);

    return (
        <div className="p-10 bg-gray-100 min-h-screen">
            <h2 className="text-3xl font-bold text-center mb-6 text-blue-700">Liste des psychiatres</h2>
            <div className="flex overflow-x-auto space-x-6 p-4">
                {psychiatrists.map((psychiatrist, index) => (
                    <div key={index} className="flex-shrink-0 w-96 bg-white shadow-lg rounded-xl p-6 border border-gray-200 hover:shadow-xl transition-shadow">
                        <h3 className="text-xl font-semibold text-gray-800">{psychiatrist.username}</h3>
                        <p className="text-gray-600 mt-2"><strong>Disponibilités :</strong></p>
                        <ul className="mt-2">
                            {psychiatrist.availability.map((avail, idx) => (
                                <li key={idx} className="text-gray-700 text-sm bg-gray-200 px-3 py-1 rounded-lg mb-1 inline-block">
                                    {avail.day}: {avail.startTime} - {avail.endTime}
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PsychiatristList;
