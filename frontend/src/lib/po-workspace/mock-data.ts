import type { PurchaseOrderLine } from "./types";

const poTypes = [
  "Implementation",
  "Service Package",
  "Transportation",
  "Site Visit",
  "Supply",
];

const projectNames = [
  "Network Expansion Phase III",
  "Data Center Migration",
  "Customer Portal Upgrade",
  "ERP System Implementation",
  "Security Infrastructure",
  "Cloud Migration Project",
  "Mobile Network Rollout",
  "Fiber Optic Deployment",
];

const projectManagers = [
  "J. Thompson",
  "M. Rodriguez",
  "S. Chen",
  "A. Patel",
  "R. Williams",
  "K. Johnson",
  "D. Brown",
  "L. Martinez",
];

const itemDescriptions = [
  "Cisco Router ASR 9000 Series",
  "Dell PowerEdge R750 Server",
  "VMware vSphere Enterprise License",
  "Network Cable CAT6A 1000ft",
  "Fiber Optic Transceiver Module",
  "Annual Maintenance Contract",
  "Technical Consulting Services",
  "Project Management Services",
  "Software Development Services",
  "Security Appliance Firewall",
  "Storage Array NetApp AFF A400",
  "UPS Power Backup System",
  "Rack Cabinet 42U",
  "Patch Panel 48-Port",
  "Switch Cisco Catalyst 9300",
];

function generateDUID(): string {
  return `DU-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

function generatePONumber(): string {
  const year = 2024 + Math.floor(Math.random() * 2);
  const num = Math.floor(Math.random() * 9000) + 1000;
  return `PO-${year}-${num}`;
}

function generateProjectCode(): string {
  const prefix = ["PRJ", "NET", "INF", "SEC", "CLD"][
    Math.floor(Math.random() * 5)
  ];
  const num = Math.floor(Math.random() * 900) + 100;
  return `${prefix}-${num}`;
}

export function generateMockData(count: number = 150): PurchaseOrderLine[] {
  const data: PurchaseOrderLine[] = [];

  // Generate groups of related PO lines (same PO number, different line items)
  let currentId = 1;
  let i = 0;

  while (i < count) {
    const poNumber = generatePONumber();
    const duid = generateDUID();
    const projectCode = generateProjectCode();
    const projectName =
      projectNames[Math.floor(Math.random() * projectNames.length)];
    const pm =
      projectManagers[Math.floor(Math.random() * projectManagers.length)];
    const poType = poTypes[Math.floor(Math.random() * poTypes.length)];

    // Each PO can have 1-5 line items
    const lineCount = Math.min(Math.floor(Math.random() * 5) + 1, count - i);

    for (let line = 1; line <= lineCount; line++) {
      const unitPrice = Math.floor(Math.random() * 50000) + 500;
      const requestedQuantity = Math.floor(Math.random() * 20) + 1;
      const poLineAmount = unitPrice * requestedQuantity;
      const contractAmount = poLineAmount * (1 + Math.random() * 0.2);
      const amountRequested = poLineAmount * (0.8 + Math.random() * 0.2);
      const amountSpent = amountRequested * (0.5 + Math.random() * 0.5);

      data.push({
        id: `${currentId++}`,
        duid,
        poNumber,
        projectCode,
        projectName,
        pm,
        poLineNumber: line,
        poType,
        unitPrice,
        requestedQuantity,
        poLineAmount,
        itemDescription:
          itemDescriptions[Math.floor(Math.random() * itemDescriptions.length)],
        contractAmount,
        amountRequested,
        amountSpent,
      });

      i++;
    }
  }

  return data;
}

export const PO_TYPES = poTypes;
