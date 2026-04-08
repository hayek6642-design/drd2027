import SettaXtes3a from "./SettaXtes3a";
import BankodeTab from "./BankodeTab";
import CorsaTab from "./CorsaTab";
import E7kiTab from "./E7kiTab";
import FarragnaTab from "./FarragnaTab";
import NostagliaTab from "./NostagliaTab";

export const tabs = [
  { id: "bankode", label: "CodeBank", component: <BankodeTab /> },
  { id: "corsa", label: "Corsa", component: <CorsaTab /> },
  { id: "e7ki", label: "E7ki", component: <E7kiTab /> },
  { id: "farragna", label: "Farragna", component: <FarragnaTab /> },
  { id: "setta", label: "Setta X Tes3a", component: <SettaXtes3a /> },
  { id: "nostaglia", label: "Nostaglia", component: <NostagliaTab /> },
];