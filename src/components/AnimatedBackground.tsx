// Simple static background - no animations, gradients, or glow effects
// Per design spec: Professional, minimal, protocol-grade UI

function AnimatedBackground() {
    return (
        <div className="fixed inset-0 -z-10 bg-surface-main" />
    );
}

export default AnimatedBackground;
