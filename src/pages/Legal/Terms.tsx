import { MarketingLayout } from '../../components/Marketing/MarketingLayout';
import { LegalLayout, legalH2, legalP } from '../../components/Marketing/primitives';

export default function Terms() {
  return (
    <MarketingLayout title="Términos y condiciones">
      <LegalLayout title="Términos y condiciones" updated="13 de junio de 2026">
        <p style={legalP}>Bienvenido a TRACE by ETX. Al usar nuestro servicio aceptas estos términos. Por favor léelos con atención.</p>

        <h2 style={legalH2}>1. Sobre nosotros</h2>
        <p style={legalP}>TRACE by ETX es un servicio digital de journal de trading operado desde España. "Nosotros", "nuestro" o "TRACE" se refiere al servicio.</p>

        <h2 style={legalH2}>2. Aceptación de términos</h2>
        <p style={legalP}>Al crear una cuenta o usar TRACE aceptas estos términos y nuestra Política de Privacidad. Si no estás de acuerdo, no uses el servicio.</p>

        <h2 style={legalH2}>3. Descripción del servicio</h2>
        <p style={legalP}>TRACE proporciona herramientas para que traders registren, analicen y mejoren su actividad de trading. Es una herramienta educativa y de análisis personal — NO es un servicio de asesoramiento financiero, recomendación de inversión o señales de trading.</p>

        <h2 style={legalH2}>4. Cuenta de usuario</h2>
        <p style={legalP}>Para usar TRACE necesitas tener al menos 18 años, proporcionar información veraz, mantener segura tu contraseña y no compartir tu cuenta con terceros. Tú eres responsable de toda actividad bajo tu cuenta.</p>

        <h2 style={legalH2}>5. Planes y pagos</h2>
        <p style={legalP}><b>Plan Gratis:</b> sin coste, limitado a 30 operaciones por mes, funcionalidades básicas.</p>
        <p style={legalP}><b>Plan Pro:</b> €29/mes (mensual) o €228/año (anual, equivalente a €19/mes), acceso a todas las funcionalidades, cancelable en cualquier momento.</p>
        <p style={legalP}><b>Renovación automática:</b> las suscripciones se renuevan automáticamente al final del periodo. Puedes cancelar desde Ajustes → Plan y facturación.</p>
        <p style={legalP}><b>Reembolsos:</b> reembolso completo dentro de los 14 días naturales tras la primera compra (derecho de desistimiento UE). Pasados los 14 días, no se realizan reembolsos por periodos ya iniciados. Solicitudes: soporte@traceetx.com.</p>

        <h2 style={legalH2}>6. Uso aceptable</h2>
        <p style={legalP}>No puedes usar TRACE para actividades ilegales, acceder a cuentas de otros usuarios, realizar ingeniería inversa, sobrecargar nuestros servidores, suplantar identidad o compartir contenido ofensivo o ilegal. Nos reservamos el derecho de suspender cuentas que violen estos términos.</p>

        <h2 style={legalH2}>7. Propiedad intelectual</h2>
        <p style={legalP}>El software, marca, logos y contenido de TRACE son propiedad de TRACE by ETX. Tu contenido (operaciones, notas, etc.) sigue siendo tuyo — solo nos das licencia para almacenarlo y procesarlo para proporcionarte el servicio.</p>

        <h2 style={legalH2}>8. Exención de responsabilidad</h2>
        <p style={legalP}>TRACE NO proporciona asesoramiento financiero. El trading conlleva riesgo de pérdida total del capital invertido. Los resultados mostrados son de tus operaciones — no garantizan resultados futuros. Eres el único responsable de tus decisiones de trading. TRACE se proporciona "tal cual" sin garantías de ningún tipo.</p>

        <h2 style={legalH2}>9. Limitación de responsabilidad</h2>
        <p style={legalP}>En la medida máxima permitida por ley, TRACE no será responsable de daños indirectos, lucro cesante, pérdida de datos, o cualquier daño relacionado con el uso del servicio. Nuestra responsabilidad total se limita al importe pagado por ti en los últimos 12 meses.</p>

        <h2 style={legalH2}>10. Modificaciones</h2>
        <p style={legalP}>Podemos actualizar estos términos. Te notificaremos por email de cambios significativos. El uso continuado del servicio tras los cambios constituye aceptación.</p>

        <h2 style={legalH2}>11. Terminación</h2>
        <p style={legalP}>Tú puedes cancelar tu cuenta en cualquier momento desde Ajustes. Nosotros podemos suspender o terminar cuentas que violen estos términos.</p>

        <h2 style={legalH2}>12. Ley aplicable y jurisdicción</h2>
        <p style={legalP}>Estos términos se rigen por la ley española. Cualquier disputa se resolverá en los tribunales correspondientes, salvo que la normativa de consumo aplicable disponga otra cosa.</p>

        <h2 style={legalH2}>13. Contacto</h2>
        <p style={legalP}>Para cualquier pregunta sobre estos términos: legal@traceetx.com</p>
      </LegalLayout>
    </MarketingLayout>
  );
}
