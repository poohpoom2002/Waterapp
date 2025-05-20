export const languages = {
    en: {
        title: 'Plant Layout Generator',
        description: 'Draw an area on the map (recommended not over 10 hectares) and select the area type and plant type to proceed.',
        areaConfiguration: 'Area Configuration',
        plantSelection: 'Plant Selection',
        selectPlantType: 'Select a plant type',
        next: 'Next',
        status: {
            initial: 'Draw an area on the map first',
            selectAreaType: 'Select an area type to begin',
            drawAreaFirst: 'Please draw an area first before adding a {type}',
            pumpPlacement: 'Click on the map to place a pump',
            riverPlacement: 'Use the polygon tool to draw the river area',
            fieldPlacement: 'Use the polygon tool to draw the field area',
            buildingPlacement: 'Use the rectangle tool to draw the building area',
            powerPlantPlacement: 'Use the rectangle tool to draw the power plant area',
            pumpAdded: 'Pump location added. Select another area type to continue.',
            buildingAdded: 'Building added. Select another area type to continue.',
            powerPlantAdded: 'Power plant added. Select another area type to continue.',
            areaAdded: 'Added {type} area. Select another area type to continue.',
            selectedTypes: 'Selected types: {types}',
            selectAreaOrDraw: 'Select area type(s) or draw an area on the map.',
            calculating: 'Calculating optimal plant positions for {types}...',
            success: 'Successfully generated {count} planting points',
            failed: 'Failed to generate planting points'
        },
        areaTypes: {
            field: 'Agricultural land for planting crops and vegetation.',
            river: 'Water body for irrigation and water management.',
            powerplant: 'Energy generation facility area.',
            building: 'Structure or facility area.',
            pump: 'Water pump station for irrigation system.'
        },
        errors: {
            drawAreaFirst: 'Please draw an area on the map first',
            selectPlantType: 'Please select a plant type',
            areaTooLarge: 'Area is too large. Maximum allowed area is {max} hectares',
            finishCurrentAction: 'Please finish the current action first',
            navigationFailed: 'Failed to navigate to the next page. Please make sure you are logged in.',
            validationFailed: 'Please select an area type, draw an area, and select a plant type before proceeding.'
        }
    },
    th: {
        title: 'เครื่องมือวางแผนการปลูกพืช',
        description: 'วาดพื้นที่บนแผนที่ (แนะนำไม่เกิน 10 เฮกตาร์) และเลือกประเภทพื้นที่และประเภทพืชเพื่อดำเนินการต่อ',
        areaConfiguration: 'การกำหนดค่าพื้นที่',
        plantSelection: 'การเลือกพืช',
        selectPlantType: 'เลือกประเภทพืช',
        next: 'ถัดไป',
        status: {
            initial: 'วาดพื้นที่บนแผนที่ก่อน',
            selectAreaType: 'เลือกประเภทพื้นที่เพื่อเริ่มต้น',
            drawAreaFirst: 'กรุณาวาดพื้นที่ก่อนเพิ่ม{type}',
            pumpPlacement: 'คลิกบนแผนที่เพื่อวางปั๊มน้ำ',
            riverPlacement: 'ใช้เครื่องมือวาดรูปหลายเหลี่ยมเพื่อวาดพื้นที่แม่น้ำ',
            fieldPlacement: 'ใช้เครื่องมือวาดรูปหลายเหลี่ยมเพื่อวาดพื้นที่เกษตรกรรม',
            buildingPlacement: 'ใช้เครื่องมือวาดสี่เหลี่ยมเพื่อวาดพื้นที่อาคาร',
            powerPlantPlacement: 'ใช้เครื่องมือวาดสี่เหลี่ยมเพื่อวาดพื้นที่โรงไฟฟ้า',
            pumpAdded: 'เพิ่มตำแหน่งปั๊มน้ำแล้ว เลือกประเภทพื้นที่อื่นเพื่อดำเนินการต่อ',
            buildingAdded: 'เพิ่มอาคารแล้ว เลือกประเภทพื้นที่อื่นเพื่อดำเนินการต่อ',
            powerPlantAdded: 'เพิ่มโรงไฟฟ้าแล้ว เลือกประเภทพื้นที่อื่นเพื่อดำเนินการต่อ',
            areaAdded: 'เพิ่มพื้นที่{type}แล้ว เลือกประเภทพื้นที่อื่นเพื่อดำเนินการต่อ',
            selectedTypes: 'ประเภทที่เลือก: {types}',
            selectAreaOrDraw: 'เลือกประเภทพื้นที่หรือวาดพื้นที่บนแผนที่',
            calculating: 'กำลังคำนวณตำแหน่งการปลูกพืชที่เหมาะสมสำหรับ{types}...',
            success: 'สร้างจุดปลูกพืชสำเร็จ {count} จุด',
            failed: 'ไม่สามารถสร้างจุดปลูกพืชได้'
        },
        areaTypes: {
            field: 'พื้นที่เกษตรกรรมสำหรับปลูกพืชและพืชพรรณ',
            river: 'แหล่งน้ำสำหรับการชลประทานและการจัดการน้ำ',
            powerplant: 'พื้นที่โรงไฟฟ้า',
            building: 'พื้นที่โครงสร้างหรือสิ่งอำนวยความสะดวก',
            pump: 'สถานีปั๊มน้ำสำหรับระบบชลประทาน'
        },
        errors: {
            drawAreaFirst: 'กรุณาวาดพื้นที่บนแผนที่ก่อน',
            selectPlantType: 'กรุณาเลือกประเภทพืช',
            areaTooLarge: 'พื้นที่ใหญ่เกินไป พื้นที่สูงสุดที่อนุญาตคือ {max} เฮกตาร์',
            finishCurrentAction: 'กรุณาทำการกระทำปัจจุบันให้เสร็จก่อน',
            navigationFailed: 'ไม่สามารถนำทางไปยังหน้าถัดไปได้ กรุณาตรวจสอบว่าคุณได้เข้าสู่ระบบแล้ว',
            validationFailed: 'กรุณาเลือกประเภทพื้นที่ วาดพื้นที่ และเลือกประเภทพืชก่อนดำเนินการต่อ'
        }
    }
};

export type Language = 'en' | 'th'; 