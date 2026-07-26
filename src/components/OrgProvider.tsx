"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useSession } from "next-auth/react";

type OrgContextType = {
  currentOrgId: string | undefined;
  currentOrgName: string | undefined;
  currentOrgCurrency: string;
  currentRole: string | undefined;
  setCurrentOrg: (orgId: string, orgName: string, role: string) => void;
  organizations: { id: string; name: string; slug: string }[];
  setOrganizations: (orgs: { id: string; name: string; slug: string }[]) => void;
  switchOrg: (orgId: string) => void;
};

const OrgContext = createContext<OrgContextType>({
  currentOrgId: undefined,
  currentOrgName: undefined,
  currentOrgCurrency: "INR",
  currentRole: undefined,
  setCurrentOrg: () => {},
  organizations: [],
  setOrganizations: () => {},
  switchOrg: () => {},
});

export function OrgProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const [currentOrgId, setCurrentOrgId] = useState<string | undefined>(
    (session?.user as { orgId?: string })?.orgId,
  );
  const [currentOrgName, setCurrentOrgName] = useState<string | undefined>(undefined);
  const [currentOrgCurrency, setCurrentOrgCurrency] = useState("INR");
  const [currentRole, setCurrentRole] = useState<string | undefined>(
    (session?.user as { role?: string })?.role,
  );
  const [organizations, setOrganizations] = useState<
    { id: string; name: string; slug: string }[]
  >([]);

  useEffect(() => {
    if (currentOrgId) {
      fetch("/api/organization/settings")
        .then((r) => r.json())
        .then((data) => {
          if (data.currency) setCurrentOrgCurrency(data.currency);
        })
        .catch(() => {});
    }
  }, [currentOrgId]);

  function setCurrentOrg(orgId: string, orgName: string, role: string) {
    setCurrentOrgId(orgId);
    setCurrentOrgName(orgName);
    setCurrentRole(role);
  }

  function switchOrg(orgId: string) {
    const org = organizations.find((o) => o.id === orgId);
    if (org) {
      setCurrentOrgId(org.id);
      setCurrentOrgName(org.name);
    }
  }

  return (
    <OrgContext.Provider
      value={{
        currentOrgId,
        currentOrgName,
        currentOrgCurrency,
        currentRole,
        setCurrentOrg,
        organizations,
        setOrganizations,
        switchOrg,
      }}
    >
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg() {
  return useContext(OrgContext);
}
