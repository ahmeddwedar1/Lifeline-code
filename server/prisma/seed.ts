import { PrismaClient, Role, BloodType, AmbulanceStatus, ResourceStatus, ResourceType, EmergencySeverity } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const passwordHash = await bcrypt.hash('Admin1234', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@lifeline.com' },
    update: {},
    create: {
      email: 'admin@lifeline.com',
      passwordHash,
      fullName: 'System Admin',
      role: 'ADMIN',
      status: 'ACTIVE',
      emailVerified: true,
    },
  });
  console.log('Admin user created:', admin.email);

  const hospitals = await Promise.all([
    prisma.hospital.create({
      data: {
        name: 'Cairo General Hospital',
        address: '15 Tahrir Square, Cairo',
        city: 'Cairo',
        state: 'Cairo Governorate',
        country: 'Egypt',
        latitude: 30.0444,
        longitude: 31.2357,
        phone: '+20-2-12345678',
        email: 'info@cairohospital.com',
        specializations: ['Emergency', 'Cardiology', 'Trauma', 'Neurology'],
        totalBeds: 200,
        availableBeds: 45,
        icuBeds: 40,
        availableIcuBeds: 8,
        nicuBeds: 20,
        availableNicuBeds: 5,
        ventilatorCount: 50,
        availableVentilators: 12,
        verified: true,
      },
    }),
    prisma.hospital.create({
      data: {
        name: 'Alexandria Medical Center',
        address: '3 Corniche Road, Alexandria',
        city: 'Alexandria',
        state: 'Alexandria Governorate',
        country: 'Egypt',
        latitude: 31.2001,
        longitude: 29.9187,
        phone: '+20-3-23456789',
        email: 'contact@alexmedcenter.com',
        specializations: ['Pediatrics', 'Neurology', 'ICU', 'Orthopedics'],
        totalBeds: 150,
        availableBeds: 23,
        icuBeds: 25,
        availableIcuBeds: 4,
        nicuBeds: 15,
        availableNicuBeds: 3,
        ventilatorCount: 30,
        availableVentilators: 6,
        verified: true,
      },
    }),
    prisma.hospital.create({
      data: {
        name: 'Maadi Specialized Hospital',
        address: '7 Road 9, Maadi, Cairo',
        city: 'Cairo',
        state: 'Cairo Governorate',
        country: 'Egypt',
        latitude: 29.9602,
        longitude: 31.2569,
        phone: '+20-2-34567890',
        email: 'info@maadihospital.com',
        specializations: ['Orthopedics', 'Surgery', 'Oncology', 'Cardiology'],
        totalBeds: 100,
        availableBeds: 12,
        icuBeds: 15,
        availableIcuBeds: 2,
        nicuBeds: 10,
        availableNicuBeds: 1,
        ventilatorCount: 20,
        availableVentilators: 3,
        verified: true,
      },
    }),
  ]);
  console.log(`${hospitals.length} hospitals created`);

  for (const hospital of hospitals) {
    const bloodTypes = ['A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG'] as BloodType[];
    for (const bt of bloodTypes) {
      await prisma.bloodStock.create({
        data: {
          hospitalId: hospital.id,
          bloodType: bt,
          unitsAvailable: Math.floor(Math.random() * 20) + 5,
        },
      });
    }
  }
  console.log('Blood stock created for all hospitals');

  for (let i = 0; i < hospitals.length; i++) {
    const hospital = hospitals[i];
    const resources: any[] = [];
    const types = ['ICU', 'NICU', 'VENTILATOR', 'GENERAL_BED'] as ResourceType[];
    for (const type of types) {
      for (let j = 0; j < 5; j++) {
        resources.push({
          hospitalId: hospital.id,
          resourceType: type,
          name: `${type} - ${j + 1}`,
          status: Math.random() > 0.6 ? 'AVAILABLE' : (Math.random() > 0.5 ? 'OCCUPIED' : 'AVAILABLE'),
          locationInHospital: `Floor ${Math.floor(j / 2) + 1}, Ward ${type === 'ICU' ? 'A' : type === 'NICU' ? 'B' : 'C'}${j + 1}`,
        });
      }
    }
    await prisma.resource.createMany({ data: resources });

    await prisma.ambulance.create({
      data: {
        hospitalId: hospital.id,
        unitNumber: `AMB-${100 + i}`,
        status: 'AVAILABLE',
        driverName: `Driver ${i + 1}`,
        driverPhone: `0100000000${i + 1}`,
      },
    });
  }
  console.log('Resources and ambulances created');

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
