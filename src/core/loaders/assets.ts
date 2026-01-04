// 為 pathMap 加上明確的型別
export const pathMap: Record<string, string> = {
    'adwaita-d': '/background/adwaita-d.jpg',
    'adwaita-l': '/background/adwaita-l.jpg',
    'amber-d': '/background/amber-d.jpg',
    'amber-l': '/background/amber-l.jpg',
    'blobs-l': '/background/blobs-l.svg',
    'drool-d': '/background/drool-d.svg',
    'drool-l': '/background/drool-l.svg',
    'fold-d': '/background/fold-d.png',
    'fold-l': '/background/fold-l.png',
    'morphogenesis-d': '/background/morphogenesis-d.svg',
    'morphogenesis-l': '/background/morphogenesis-l.svg',
    'symbolic-d': '/background/symbolic-d.png',
    'symbolic-l': '/background/symbolic-l.png',
    'curves': '/background/curves.png',
    'lava': '/background/lava.png',
    'scie': '/background/scie.png',
    'scie-alt': '/background/scie-alt.png',
    'spaceflare': '/background/spaceflare.png',
    'spring': '/background/spring.png',
    'stripes': '/background/stripes.png',
    'terraform': '/background/terraform.png',
    'terraform-orange': '/background/terraform-orange.png',
    'waves': '/background/waves.png'
}

// 以 function 形式導出，並註明回傳型別
export function getPath(id: string): string {
    return pathMap[id] || id
}


export function getBackgroundPath(id: string): string {
    return pathMap[id] || '/background/'+id
}

// ... 其餘程式碼 ...
