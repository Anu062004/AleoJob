import { motion } from 'framer-motion';

function AnimatedBackground() {
    return (
        <div className="fixed inset-0 -z-10 overflow-hidden">
            {/* Gradient background */}
            <div
                className="absolute inset-0"
                style={{
                    background: 'linear-gradient(135deg, #0F172A 0%, #4C1D95 50%, #0F172A 100%)'
                }}
            />

            {/* Animated orbs */}
            <motion.div
                className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl"
                animate={{
                    x: [0, 100, 0],
                    y: [0, 50, 0],
                    scale: [1, 1.2, 1],
                }}
                transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: 'easeInOut',
                }}
            />

            <motion.div
                className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl"
                animate={{
                    x: [0, -100, 0],
                    y: [0, -50, 0],
                    scale: [1, 1.3, 1],
                }}
                transition={{
                    duration: 25,
                    repeat: Infinity,
                    ease: 'easeInOut',
                }}
            />

            <motion.div
                className="absolute top-1/2 right-1/3 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl"
                animate={{
                    x: [0, 50, 0],
                    y: [0, 100, 0],
                }}
                transition={{
                    duration: 15,
                    repeat: Infinity,
                    ease: 'easeInOut',
                }}
            />
        </div>
    );
}

export default AnimatedBackground;
