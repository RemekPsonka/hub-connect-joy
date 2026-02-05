import { Building, Scale, Truck, Lock, Users, Banknote } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { PropertyDomain } from './domains/PropertyDomain';
import { LiabilityDomain } from './domains/LiabilityDomain';
import { FleetDomain } from './domains/FleetDomain';
import { SpecialtyDomain } from './domains/SpecialtyDomain';
import { EmployeesDomain } from './domains/EmployeesDomain';
import { FinancialDomain } from './domains/FinancialDomain';
import type {
  TypDzialnosci,
  StatusUbezpieczenia,
  RyzykoMajatkowe,
  RyzykoOC,
  RyzykoFlota,
  RyzykoSpecjalistyczne,
  RyzykoPracownicy,
  RyzykoFinansowe,
} from './types';
import type { QuickPolicyData } from './QuickAddPolicyButton';

interface RiskDomainAccordionProps {
  operationalTypes: TypDzialnosci[];
  majatek: RyzykoMajatkowe;
  oc: RyzykoOC;
  flota: RyzykoFlota;
  specjalistyczne: RyzykoSpecjalistyczne;
  pracownicy: RyzykoPracownicy;
  finansowe: RyzykoFinansowe;
  onMajatekChange: (data: RyzykoMajatkowe) => void;
  onOcChange: (data: RyzykoOC) => void;
  onFlotaChange: (data: RyzykoFlota) => void;
  onSpecjalistyczneChange: (data: RyzykoSpecjalistyczne) => void;
  onPracownicyChange: (data: RyzykoPracownicy) => void;
  onFinansoweChange: (data: RyzykoFinansowe) => void;
  companyId?: string;
  onAddPolicy?: (data: QuickPolicyData) => void;
}

function getStatusBadge(status: StatusUbezpieczenia) {
  if (status === 'ubezpieczone') {
    return <Badge className="bg-green-500 hover:bg-green-600 text-white text-xs">Ubezpieczone</Badge>;
  }
  if (status === 'luka') {
    return <Badge variant="destructive" className="text-xs">LUKA</Badge>;
  }
  return <Badge variant="secondary" className="text-xs">N/D</Badge>;
}

function getSpecialtyStatusSummary(data: RyzykoSpecjalistyczne) {
  const gaps: string[] = [];
  if (data.cyber_status === 'luka') gaps.push('Cyber');
  if (data.do_status === 'luka') gaps.push('D&O');
  if (data.car_ear_status === 'luka') gaps.push('CAR/EAR');
  
  if (gaps.length > 0) {
    return <Badge variant="destructive" className="text-xs">LUKI: {gaps.join(', ')}</Badge>;
  }
  
  const insured: string[] = [];
  if (data.cyber_status === 'ubezpieczone') insured.push('Cyber');
  if (data.do_status === 'ubezpieczone') insured.push('D&O');
  if (data.car_ear_status === 'ubezpieczone') insured.push('CAR/EAR');
  
  if (insured.length > 0) {
    return <Badge className="bg-green-500 hover:bg-green-600 text-white text-xs">{insured.join(', ')}</Badge>;
  }
  
  return <Badge variant="secondary" className="text-xs">N/D</Badge>;
}

function getEmployeeStatusSummary(data: RyzykoPracownicy) {
  const gaps: string[] = [];
  if (data.zycie_status === 'luka') gaps.push('Życie');
  if (data.zdrowie_status === 'luka') gaps.push('Zdrowie');
  if (data.podroze_status === 'luka') gaps.push('Podróże');
  
  if (gaps.length > 0) {
    return <Badge variant="destructive" className="text-xs">LUKI: {gaps.join(', ')}</Badge>;
  }
  
  const insured: string[] = [];
  if (data.zycie_status === 'ubezpieczone') insured.push('Życie');
  if (data.zdrowie_status === 'ubezpieczone') insured.push('Zdrowie');
  if (data.podroze_status === 'ubezpieczone') insured.push('Podróże');
  
  if (insured.length > 0) {
    return <Badge className="bg-green-500 hover:bg-green-600 text-white text-xs">{insured.join(', ')}</Badge>;
  }
  
  return <Badge variant="secondary" className="text-xs">N/D</Badge>;
}

function getFinancialStatusSummary(data: RyzykoFinansowe) {
  const gaps: string[] = [];
  if (data.gwarancje_kontraktowe_status === 'luka') gaps.push('Gwarancje');
  if (data.gwarancje_celne_status === 'luka') gaps.push('Celne');
  if (data.kredyt_kupiecki_status === 'luka') gaps.push('Trade Credit');
  if (data.ochrona_prawna_status === 'luka') gaps.push('Ochrona prawna');
  
  if (gaps.length > 0) {
    return <Badge variant="destructive" className="text-xs">LUKI: {gaps.join(', ')}</Badge>;
  }
  
  const insured: string[] = [];
  if (data.gwarancje_kontraktowe_status === 'ubezpieczone') insured.push('Gwarancje');
  if (data.gwarancje_celne_status === 'ubezpieczone') insured.push('Celne');
  if (data.kredyt_kupiecki_status === 'ubezpieczone') insured.push('Trade Credit');
  if (data.ochrona_prawna_status === 'ubezpieczone') insured.push('Ochrona');
  
  if (insured.length > 0) {
    return <Badge className="bg-green-500 hover:bg-green-600 text-white text-xs">{insured.join(', ')}</Badge>;
  }
  
  return <Badge variant="secondary" className="text-xs">N/D</Badge>;
}

export function RiskDomainAccordion({
  operationalTypes,
  majatek,
  oc,
  flota,
  specjalistyczne,
  pracownicy,
  finansowe,
  onMajatekChange,
  onOcChange,
  onFlotaChange,
  onSpecjalistyczneChange,
  onPracownicyChange,
  onFinansoweChange,
  companyId,
  onAddPolicy,
}: RiskDomainAccordionProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">Domeny Ryzyka</h3>
      <Accordion type="multiple" className="space-y-2">
        <AccordionItem value="majatek" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center justify-between w-full pr-4">
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-muted-foreground" />
                <span>Majątek i Przerwy w Działalności</span>
              </div>
              {getStatusBadge(majatek.status)}
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            <PropertyDomain
              data={majatek}
              onChange={onMajatekChange}
              operationalTypes={operationalTypes}
              companyId={companyId}
              onAddPolicy={onAddPolicy}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="oc" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center justify-between w-full pr-4">
              <div className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-muted-foreground" />
                <span>Odpowiedzialność Cywilna (OC)</span>
              </div>
              {getStatusBadge(oc.status)}
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            <LiabilityDomain
              data={oc}
              onChange={onOcChange}
              operationalTypes={operationalTypes}
              companyId={companyId}
              onAddPolicy={onAddPolicy}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="flota" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center justify-between w-full pr-4">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-muted-foreground" />
                <span>Flota i Logistyka</span>
              </div>
              {getStatusBadge(flota.status)}
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            <FleetDomain
              data={flota}
              onChange={onFlotaChange}
              operationalTypes={operationalTypes}
              companyId={companyId}
              onAddPolicy={onAddPolicy}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="specjalistyczne" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center justify-between w-full pr-4">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <span>Ryzyka Specjalistyczne</span>
              </div>
              {getSpecialtyStatusSummary(specjalistyczne)}
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            <SpecialtyDomain
              data={specjalistyczne}
              onChange={onSpecjalistyczneChange}
              operationalTypes={operationalTypes}
              companyId={companyId}
              onAddPolicy={onAddPolicy}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="finansowe" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center justify-between w-full pr-4">
              <div className="flex items-center gap-2">
                <Banknote className="h-4 w-4 text-muted-foreground" />
                <span>Ubezpieczenia Finansowe</span>
              </div>
              {getFinancialStatusSummary(finansowe)}
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            <FinancialDomain
              data={finansowe}
              onChange={onFinansoweChange}
              operationalTypes={operationalTypes}
              companyId={companyId}
              onAddPolicy={onAddPolicy}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="pracownicy" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center justify-between w-full pr-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>Pracownicy</span>
              </div>
              {getEmployeeStatusSummary(pracownicy)}
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            <EmployeesDomain
              data={pracownicy}
              onChange={onPracownicyChange}
              operationalTypes={operationalTypes}
              companyId={companyId}
              onAddPolicy={onAddPolicy}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
