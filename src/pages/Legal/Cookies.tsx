import { MarketingLayout } from '../../components/Marketing/MarketingLayout';
import { LegalLayout, legalH2, legalP } from '../../components/Marketing/primitives';

export default function Cookies() {
  return (
    <MarketingLayout title="Cookies">
      <LegalLayout title="Política de cookies" updated="13 de junio de 2026">
        <p style={legalP}>Esta política explica qué cookies usamos en TRACE by ETX y cómo puedes gestionarlas.</p>

        <h2 style={legalH2}>1. ¿Qué son las cookies?</h2>
        <p style={legalP}>Las cookies son pequeños archivos de texto que se almacenan en tu dispositivo cuando visitas una web. Sirven para que la web funcione correctamente, recuerde tus preferencias y nos ayude a mejorar el servicio.</p>

        <h2 style={legalH2}>2. Cookies que usamos</h2>
        <p style={legalP}><b>Cookies esenciales</b> (sin consentimiento, necesarias): autenticación (mantenerte conectado), sesión (recordar tu estado durante la visita) y seguridad (prevenir ataques CSRF).</p>
        <p style={legalP}><b>Cookies de preferencias</b> (con consentimiento): idioma y configuración visual, color de acento personalizado (plan Pro).</p>
        <p style={legalP}><b>Cookies analíticas</b> (con consentimiento): estadísticas anónimas de uso para mejorar el producto, mediante Vercel Analytics (sin datos personales).</p>
        <p style={legalP}>NO usamos cookies de publicidad ni de seguimiento de terceros.</p>

        <h2 style={legalH2}>3. Gestión de cookies</h2>
        <p style={legalP}>Puedes gestionar tus preferencias en cualquier momento desde el banner de cookies o desde la configuración de tu navegador (Chrome: chrome://settings/cookies, Firefox: about:preferences#privacy, Safari: Preferencias → Privacidad). Bloquear cookies esenciales puede impedir el funcionamiento correcto del servicio.</p>

        <h2 style={legalH2}>4. Retención de cookies</h2>
        <p style={legalP}>Cookies de sesión: se eliminan al cerrar el navegador. Cookies persistentes: hasta 12 meses. Puedes eliminarlas manualmente desde tu navegador.</p>

        <h2 style={legalH2}>5. Cambios</h2>
        <p style={legalP}>Te informaremos si actualizamos esta política. Para más detalles sobre datos personales ver nuestra Política de Privacidad.</p>

        <h2 style={legalH2}>6. Contacto</h2>
        <p style={legalP}>Para preguntas: privacidad@traceetx.com</p>
      </LegalLayout>
    </MarketingLayout>
  );
}
