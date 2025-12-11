// 為 pathMap 加上明確的型別
const pathMap: Record<string, string> = {
    'adwaita-d': '/background/adwaita-d.jpg',
    'adwaita-l': '/background/adwaita-l.jpg',
    'amber-d': '/background/amber-d.jxl',
    'amber-l': '/background/amber-l.jxl',
    'blobs-l': '/background/blobs-l.svg',
    'drool-d': '/background/drool-d.svg',
    'drool-l': '/background/drool-l.svg',
    'fold-d': '/background/fold-d.jxl',
    'fold-l': '/background/fold-l.jxl',
    'morphogenesis-d': '/background/morphogenesis-d.svg',
    'morphogenesis-l': '/background/morphogenesis-l.svg',
    'symbolic-d': '/background/symbolic-d.png',
    'symbolic-l': '/background/symbolic-l.png',
}

// 以 function 形式導出，並註明回傳型別
export function getPath(id: string): string | undefined {
    return pathMap[id];
}

// ... 其餘程式碼 ...
