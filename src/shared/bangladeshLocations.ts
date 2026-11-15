import type { DeliveryZone } from './types.ts';

export interface DistrictEntry {
  nameEn: string;
  nameBn: string;
  division: string;
  defaultZone: DeliveryZone;
  upazilas: Array<{
    nameEn: string;
    nameBn: string;
    zone?: DeliveryZone;
  }>;
}

export const BANGLADESH_DISTRICTS: DistrictEntry[] = [
  {
    nameEn: 'Dhaka',
    nameBn: 'ঢাকা',
    division: 'Dhaka',
    defaultZone: 'inside_dhaka',
    upazilas: [
      { nameEn: 'Dhanmondi', nameBn: 'ধানমন্ডি', zone: 'inside_dhaka' },
      { nameEn: 'Gulshan', nameBn: 'গুলশান', zone: 'inside_dhaka' },
      { nameEn: 'Banani', nameBn: 'বনানী', zone: 'inside_dhaka' },
      { nameEn: 'Uttara', nameBn: 'উত্তরা', zone: 'inside_dhaka' },
      { nameEn: 'Mirpur', nameBn: 'মিরপুর', zone: 'inside_dhaka' },
      { nameEn: 'Mohammadpur', nameBn: 'মোহাম্মদপুর', zone: 'inside_dhaka' },
      { nameEn: 'Motijheel', nameBn: 'মতিঝিল', zone: 'inside_dhaka' },
      { nameEn: 'Bashundhara R/A', nameBn: 'বসুন্ধরা আবাসিক এলাকা', zone: 'inside_dhaka' },
      { nameEn: 'Badda', nameBn: 'বাড্ডা', zone: 'inside_dhaka' },
      { nameEn: 'Khilgaon', nameBn: 'খিলগাঁও', zone: 'inside_dhaka' },
      { nameEn: 'Savar', nameBn: 'সাভার', zone: 'sub_dhaka' },
      { nameEn: 'Keraniganj', nameBn: 'কেরানীগঞ্জ', zone: 'sub_dhaka' },
      { nameEn: 'Dhamrai', nameBn: 'ধামরাই', zone: 'sub_dhaka' },
      { nameEn: 'Dohar', nameBn: 'দোহার', zone: 'sub_dhaka' },
      { nameEn: 'Nawabganj', nameBn: 'নবাবগঞ্জ', zone: 'sub_dhaka' },
    ],
  },
  {
    nameEn: 'Gazipur',
    nameBn: 'গাজীপুর',
    division: 'Dhaka',
    defaultZone: 'sub_dhaka',
    upazilas: [
      { nameEn: 'Gazipur Sadar', nameBn: 'গাজীপুর সদর' },
      { nameEn: 'Tongi', nameBn: 'টঙ্গী' },
      { nameEn: 'Kaliakair', nameBn: 'কালিয়াকৈর' },
      { nameEn: 'Kapasia', nameBn: 'কাপাসিয়া' },
      { nameEn: 'Sreepur', nameBn: 'শ্রীপুর' },
    ],
  },
  {
    nameEn: 'Narayanganj',
    nameBn: 'নারায়ণগঞ্জ',
    division: 'Dhaka',
    defaultZone: 'sub_dhaka',
    upazilas: [
      { nameEn: 'Narayanganj Sadar', nameBn: 'নারায়ণগঞ্জ সদর' },
      { nameEn: 'Fatullah', nameBn: 'ফতুল্লা' },
      { nameEn: 'Siddhirganj', nameBn: 'সিদ্ধিরগঞ্জ' },
      { nameEn: 'Rupganj', nameBn: 'রূপগঞ্জ' },
      { nameEn: 'Sonargaon', nameBn: 'সোনারগাঁও' },
    ],
  },
  {
    nameEn: 'Chattogram',
    nameBn: 'চট্টগ্রাম',
    division: 'Chattogram',
    defaultZone: 'outside_dhaka',
    upazilas: [
      { nameEn: 'Kotwali', nameBn: 'কোতোয়ালী' },
      { nameEn: 'Panchlaish', nameBn: 'পাঁচলাইশ' },
      { nameEn: 'Halishahar', nameBn: 'হালিশহর' },
      { nameEn: 'Agrabad / Double Mooring', nameBn: 'আগ্রাবাদ / ডবলমুরিং' },
      { nameEn: 'Patiya', nameBn: 'পটিয়া' },
      { nameEn: 'Sitakunda', nameBn: 'সীতাকুণ্ড' },
      { nameEn: 'Hathazari', nameBn: 'হাটহাজারী' },
      { nameEn: 'Mirsharai', nameBn: 'মীরসরাই' },
    ],
  },
  {
    nameEn: 'Sylhet',
    nameBn: 'সিলেট',
    division: 'Sylhet',
    defaultZone: 'outside_dhaka',
    upazilas: [
      { nameEn: 'Sylhet Sadar', nameBn: 'সিলেট সদর' },
      { nameEn: 'Beanibazar', nameBn: 'বিয়ানীবাজার' },
      { nameEn: 'Golapganj', nameBn: 'গোলাপগঞ্জ' },
      { nameEn: 'Jaintiapur', nameBn: 'জৈন্তাপুর' },
      { nameEn: 'Companiganj', nameBn: 'কোম্পানীগঞ্জ' },
    ],
  },
  {
    nameEn: 'Rajshahi',
    nameBn: 'রাজশাহী',
    division: 'Rajshahi',
    defaultZone: 'outside_dhaka',
    upazilas: [
      { nameEn: 'Boalia', nameBn: 'বোয়ালিয়া' },
      { nameEn: 'Motihar', nameBn: 'মতিহার' },
      { nameEn: 'Paba', nameBn: 'পবা' },
      { nameEn: 'Godagari', nameBn: 'গোদাগাড়ী' },
      { nameEn: 'Bagha', nameBn: 'বাঘা' },
    ],
  },
  {
    nameEn: 'Khulna',
    nameBn: 'খুলনা',
    division: 'Khulna',
    defaultZone: 'outside_dhaka',
    upazilas: [
      { nameEn: 'Khulna Sadar', nameBn: 'খুলনা সদর' },
      { nameEn: 'Sonadanga', nameBn: 'সোনাডাঙ্গা' },
      { nameEn: 'Khalishpur', nameBn: 'খালিশপুর' },
      { nameEn: 'Dumuria', nameBn: 'ডুমুরিয়া' },
      { nameEn: 'Batiaghata', nameBn: 'বটিয়াঘাটা' },
    ],
  },
  {
    nameEn: 'Cumilla',
    nameBn: 'কুমিল্লা',
    division: 'Chattogram',
    defaultZone: 'outside_dhaka',
    upazilas: [
      { nameEn: 'Cumilla Adarsha Sadar', nameBn: 'কুমিল্লা আদর্শ সদর' },
      { nameEn: 'Daudkandi', nameBn: 'দাউদকান্দি' },
      { nameEn: 'Chandina', nameBn: 'চান্দিনা' },
      { nameEn: 'Laksam', nameBn: 'লাকসাম' },
      { nameEn: 'Burichang', nameBn: 'বুড়িচং' },
    ],
  },
  {
    nameEn: 'Bogura',
    nameBn: 'বগুড়া',
    division: 'Rajshahi',
    defaultZone: 'outside_dhaka',
    upazilas: [
      { nameEn: 'Bogura Sadar', nameBn: 'বগুড়া সদর' },
      { nameEn: 'Sherpur', nameBn: 'শেরপুর' },
      { nameEn: 'Shibganj', nameBn: 'শিবগঞ্জ' },
      { nameEn: 'Gabtali', nameBn: 'গাবতলী' },
    ],
  },
  {
    nameEn: 'Barishal',
    nameBn: 'বরিশাল',
    division: 'Barishal',
    defaultZone: 'outside_dhaka',
    upazilas: [
      { nameEn: 'Barishal Sadar', nameBn: 'বরিশাল সদর' },
      { nameEn: 'Bakerganj', nameBn: 'বাকেরগঞ্জ' },
      { nameEn: 'Babuganj', nameBn: 'বাবুগঞ্জ' },
      { nameEn: 'Banaripara', nameBn: 'বানারীপাড়া' },
    ],
  },
  {
    nameEn: 'Rangpur',
    nameBn: 'রংপুর',
    division: 'Rangpur',
    defaultZone: 'outside_dhaka',
    upazilas: [
      { nameEn: 'Rangpur Sadar', nameBn: 'রংপুর সদর' },
      { nameEn: 'Badarganj', nameBn: 'বদরগঞ্জ' },
      { nameEn: 'Mithapukur', nameBn: 'মিঠাপুকুর' },
      { nameEn: 'Pirganj', nameBn: 'পীরগঞ্জ' },
    ],
  },
  {
    nameEn: 'Mymensingh',
    nameBn: 'ময়মনসিংহ',
    division: 'Mymensingh',
    defaultZone: 'outside_dhaka',
    upazilas: [
      { nameEn: 'Mymensingh Sadar', nameBn: 'ময়মনসিংহ সদর' },
      { nameEn: 'Trishal', nameBn: 'ত্রিশাল' },
      { nameEn: 'Bhaluka', nameBn: 'ভালুকা' },
      { nameEn: 'Muktagachha', nameBn: 'মুক্তাগাছা' },
    ],
  },
  {
    nameEn: "Cox's Bazar",
    nameBn: 'কক্সবাজার',
    division: 'Chattogram',
    defaultZone: 'outside_dhaka',
    upazilas: [
      { nameEn: "Cox's Bazar Sadar", nameBn: 'কক্সবাজার সদর' },
      { nameEn: 'Chakaria', nameBn: 'চকরিয়া' },
      { nameEn: 'Teknaf', nameBn: 'টেকনাফ' },
      { nameEn: 'Ukhia', nameBn: 'উখিয়া' },
    ],
  },
  {
    nameEn: 'Jashore',
    nameBn: 'যশোর',
    division: 'Khulna',
    defaultZone: 'outside_dhaka',
    upazilas: [
      { nameEn: 'Jashore Sadar', nameBn: 'যশোর সদর' },
      { nameEn: 'Jhikargachha', nameBn: 'ঝিকরগাছা' },
      { nameEn: 'Benapole / Sharsha', nameBn: 'বেনাপোল / শার্শা' },
    ],
  },
  {
    nameEn: 'Narsingdi',
    nameBn: 'নরসিংদী',
    division: 'Dhaka',
    defaultZone: 'outside_dhaka',
    upazilas: [
      { nameEn: 'Narsingdi Sadar', nameBn: 'নরসিংদী সদর' },
      { nameEn: 'Palash', nameBn: 'পলাশ' },
      { nameEn: 'Raipura', nameBn: 'রায়পুরা' },
    ],
  },
  {
    nameEn: 'Tangail',
    nameBn: 'টাঙ্গাইল',
    division: 'Dhaka',
    defaultZone: 'outside_dhaka',
    upazilas: [
      { nameEn: 'Tangail Sadar', nameBn: 'টাঙ্গাইল সদর' },
      { nameEn: 'Mirzapur', nameBn: 'মির্জাপুর' },
      { nameEn: 'Madhupur', nameBn: 'মধুপুর' },
    ],
  },
  {
    nameEn: 'Pabna',
    nameBn: 'পাবনা',
    division: 'Rajshahi',
    defaultZone: 'outside_dhaka',
    upazilas: [
      { nameEn: 'Pabna Sadar', nameBn: 'পাবনা সদর' },
      { nameEn: 'Ishwardi', nameBn: 'ঈশ্বরদী' },
      { nameEn: 'Bera', nameBn: 'বেড়া' },
    ],
  },
  {
    nameEn: 'Dinajpur',
    nameBn: 'দিনাজপুর',
    division: 'Rangpur',
    defaultZone: 'outside_dhaka',
    upazilas: [
      { nameEn: 'Dinajpur Sadar', nameBn: 'দিনাজপুর সদর' },
      { nameEn: 'Birampur', nameBn: 'বিরামপুর' },
      { nameEn: 'Parbatipur', nameBn: 'পার্বতীপুর' },
    ],
  },
];

export function resolveDeliveryZone(districtName: string, upazilaName: string): DeliveryZone {
  const district = BANGLADESH_DISTRICTS.find(
    (d) => d.nameEn.toLowerCase() === districtName.toLowerCase()
  );
  if (!district) return 'outside_dhaka';
  const upazila = district.upazilas.find(
    (u) => u.nameEn.toLowerCase() === upazilaName.toLowerCase()
  );
  return upazila?.zone ?? district.defaultZone;
}
