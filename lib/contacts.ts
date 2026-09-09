export type Contact = {
  id: string;
  name: string;
  addressOrEns: string;
  createdAt: number;
};

const CONTACTS_KEY = "crypto-blick:contacts";
const CONTACTS_EVENT = "crypto-blick:contacts-changed";

function canUseStorage() {
  return typeof window !== "undefined";
}

function normalizeAddress(address: string) {
  return address.toLowerCase();
}

type ContactsByAddress = Record<string, Contact[]>;

function readContactsMap(): ContactsByAddress {
  if (!canUseStorage()) return {};
  try {
    const raw = window.localStorage.getItem(CONTACTS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as ContactsByAddress;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
}

function writeContactsMap(contacts: ContactsByAddress) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts));
  window.dispatchEvent(new Event(CONTACTS_EVENT));
}

export function subscribeToContacts(onStoreChange: () => void) {
  if (!canUseStorage()) return () => {};

  function onStorage(event: StorageEvent) {
    if (event.key === CONTACTS_KEY) onStoreChange();
  }

  window.addEventListener(CONTACTS_EVENT, onStoreChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CONTACTS_EVENT, onStoreChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function getContactsSnapshot() {
  if (!canUseStorage()) return "{}";
  return window.localStorage.getItem(CONTACTS_KEY) ?? "{}";
}

export function getServerContactsSnapshot() {
  return "{}";
}

export function getContacts(address: string, snapshot?: string): Contact[] {
  let map: ContactsByAddress;

  if (snapshot === undefined) {
    map = readContactsMap();
  } else {
    try {
      const parsed = JSON.parse(snapshot) as ContactsByAddress;
      map = parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed
        : {};
    } catch {
      map = {};
    }
  }

  return [...(map[normalizeAddress(address)] ?? [])].sort(
    (a, b) => b.createdAt - a.createdAt,
  );
}

export function addContact(
  ownerAddress: string,
  input: {
    name: string;
    addressOrEns: string;
  },
): Contact {
  const contact: Contact = {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    addressOrEns: input.addressOrEns.trim(),
    createdAt: Date.now(),
  };

  const map = readContactsMap();
  const owner = normalizeAddress(ownerAddress);
  const contacts = map[owner] ?? [];
  contacts.push(contact);
  map[owner] = contacts;
  writeContactsMap(map);
  return contact;
}

export function removeContact(ownerAddress: string, id: string) {
  const map = readContactsMap();
  const owner = normalizeAddress(ownerAddress);
  map[owner] = (map[owner] ?? []).filter((contact) => contact.id !== id);
  writeContactsMap(map);
}
