resources/js/pages/product/
├── Product.tsx                      # Main component (ไฟล์หลัก)
├── types/
│   └── interfaces.ts               # Interface ทั้งหมด
├── utils/
│   └── calculations.ts             # ฟังก์ชันการคำนวณ utility
├── hooks/
│   └── useCalculations.ts          # Custom hook สำหรับการคำนวณ
├── components/
│   ├── InputForm.tsx               # ฟอร์มกรอกข้อมูล
│   ├── CalculationSummary.tsx      # สรุปการคำนวณ
│   ├── SprinklerSelector.tsx       # เลือกสปริงเกอร์
│   ├── PumpSelector.tsx            # เลือกปั๊ม
│   ├── PipeSelector.tsx            # เลือกท่อ (reusable)
│   ├── CostSummary.tsx             # สรุปราคา
│   ├── QuotationModal.tsx          # Modal ใบเสนอราคา
│   └── QuotationDocument.tsx       # เอกสารใบเสนอราคา
└── product/                        
    ├── Pipe.ts
    ├── Pump.ts
    └── Sprinkler.ts