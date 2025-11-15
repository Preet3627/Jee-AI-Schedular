// FIX: Add declarations for Buffer and module to satisfy TypeScript compiler
// in a browser-only environment where Node.js globals are not defined.
// These are used for Node.js compatibility when this file is imported by the server.
declare var Buffer: any;
declare var module: any;

const COLORS = [ '#0891b2', '#7c3aed', '#16a34a', '#db2777', '#ca8a04', '#d97706', '#6d28d9', '#0d9488', '#be185d' ];

const btoaNode = (str: string) => Buffer.from(str).toString('base64');
const _btoa = typeof window !== 'undefined' ? window.btoa : btoaNode;

export const generateAvatar = (name: string): string => {
    if (!name) {
        return 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2FlYWViYiI+PHBhdGggZD0iTTEyIDJDNi40OCAyIDIgNi40OCAyIDEyczQuNDggMTAgMTAgMTAgMTAtNC40OCAxMC0xMFMxNy41MiAyIDEyIDptMCAzYzEuNjYgMCAzIDEuMzQgMyAzcy0xLjM0IDMtMyAzLTMtMS4zNC0zLTMgMS4zNC0zIDMtM20wIDE0LjJjLTIuNSAwLTQuNzEtMS4yOC02LTIuMjIuMDMtMi41MyA0LTIuOTggNi0yLjk4czUuOTcgLjQ1IDYgMi45OGMtMS4yOS45NC0zLjUgMi4yMi02IDIuMjJ6Ii8+PC9zdmc+';
    }

    const initials = name
        .split(' ')
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
    
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const color = COLORS[Math.abs(hash % COLORS.length)];

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="${color}" /><text x="50" y="55" font-family="Arial, sans-serif" font-size="45" fill="#FFFFFF" text-anchor="middle" dominant-baseline="middle">${initials}</text></svg>`;

    return `data:image/svg+xml;base64,${_btoa(svg)}`;
};

// For Node.js compatibility in server.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { generateAvatar };
}
