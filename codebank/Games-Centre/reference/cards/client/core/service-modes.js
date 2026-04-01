export const ServiceModes = {
    A: {
        id: 'A',
        name: 'Basic',
        features: [],
        fee: 100,
        reward: 210
    },
    B: {
        id: 'B',
        name: 'Text Chat',
        features: ['chat'],
        fee: 500,
        reward: 1050
    },
    C: {
        id: 'C',
        name: 'Full Service',
        features: ['chat', 'audio', 'video'],
        fee: 1000,
        reward: 2100
    }
};

export function getServiceDetails(level) {
    return ServiceModes[level] || ServiceModes.A;
}
