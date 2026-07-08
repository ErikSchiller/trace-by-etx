import { MarketingLayout } from '../../components/Marketing/MarketingLayout';
import { LegalLayout, legalH2, legalP } from '../../components/Marketing/primitives';

export default function LegalNotice() {
  return (
    <MarketingLayout title="Aviso legal">
      <LegalLayout title="Aviso legal" updated="13 de junio de 2026">
        <p style={legalP}>En cumplimiento del artículo 10 de la Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la Información y de Comercio Electrónico (LSSI-CE), se informa:</p>

        <h2 style={legalH2}>Titular del sitio web</h2>
        <p style={legalP}>TRACE by ETX</p>
        <p style={legalP}>Email de contacto: soporte@traceetx.com</p>
        <p style={legalP}>Dirección: [completar con tu dirección fiscal]</p>
        <p style={legalP}>NIF/CIF: [completar]</p>

        <h2 style={legalH2}>Aceptación</h2>
        <p style={legalP}>El acceso y uso del sitio implica la aceptación de las condiciones recogidas en este aviso legal, en la política de privacidad y en la política de cookies.</p>
      </LegalLayout>
    </MarketingLayout>
  );
}
