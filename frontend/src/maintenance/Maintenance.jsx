import React, { useEffect, useState } from "react";

const Maintenance = () => {
    const messages = [
        "Upgrading CrimeGPT systems...",
        "Improving AI legal assistance...",
        "Enhancing document generation...",
        "Making CrimeGPT faster and smarter..."
    ];

    const [messageIndex, setMessageIndex] = useState(0);
    const [dots, setDots] = useState("");

    useEffect(() => {
        const messageTimer = setInterval(() => {
            setMessageIndex((prev) => (prev + 1) % messages.length);
        }, 3000);

        const dotTimer = setInterval(() => {
            setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
        }, 500);

        return () => {
            clearInterval(messageTimer);
            clearInterval(dotTimer);
        };
    }, []);

    return (
        <div
            className="relative h-screen w-full flex items-center justify-center bg-cover bg-center text-center px-5"
            style={{
                backgroundImage:
                    "url(https://images.pexels.com/photos/260689/pexels-photo-260689.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=500)",
            }}
        >
            <div className="absolute inset-0 bg-gray-900 opacity-75"></div>

            <div className="relative z-50 flex flex-col justify-center text-white w-full h-screen">
                <h1 className="text-5xl font-bold">
                    CrimeGPT is Under Maintenance.{dots}
                </h1>

                <p className="mt-4 text-lg text-gray-300 transition-all">
                    {messages[messageIndex]}
                </p>

                <div className="mt-10 mb-5">
                    <div className="shadow w-full bg-white/30 max-w-2xl mx-auto rounded-full">
                        <div
                            className="rounded-full bg-indigo-600 text-xs leading-none text-center text-white py-1 animate-pulse"
                            style={{ width: "75%" }}
                        >
                            Updating...
                        </div>
                    </div>
                </div>

                <p className="mt-8 text-sm text-gray-300">
                    National Law Enforcement Portal • {new Date().getFullYear()}
                </p>
            </div>
        </div>
    );
};

export default Maintenance;