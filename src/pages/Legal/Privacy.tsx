import { MarketingLayout } from '../../components/Marketing/MarketingLayout';
import { LegalLayout, legalH2, legalP } from '../../components/Marketing/primitives';

export default function Privacy() {
  return (
    <MarketingLayout title="Privacidad">
      <LegalLayout title="Política de privacidad" updated="13 de junio de 2026">
        <p style={legalP}>En TRACE by ETX ("nosotros", "nuestro") respetamos tu privacidad y nos comprometemos a proteger tus datos personales. Esta política explica cómo recogemos, usamos y protegemos tu información.</p>

        <h2 style={legalH2}>1. Responsable del tratamiento</h2>
        <p style={legalP}>TRACE by ETX. Email: privacidad@traceetx.com. Operado en: España.</p>

        <h2 style={legalH2}>2. Datos que recogemos</h2>
        <p style={legalP}><b>Datos que tú nos proporcionas:</b> datos de cuenta (nombre, email, contraseña cifrada), datos de trading (operaciones, notas, configuración) y datos de pago (gestionados por Stripe — no almacenamos números de tarjeta).</p>
        <p style={legalP}><b>Datos automáticos:</b> información del dispositivo (navegador, sistema operativo), dirección IP anonimizada y estadísticas de uso anónimas.</p>

        <h2 style={legalH2}>3. Para qué usamos tus datos</h2>
        <p style={legalP}>Proporcionar el servicio (registro y análisis de tus operaciones), procesar pagos, enviarte comunicaciones esenciales, mejorar el producto mediante análisis agregados y anónimos, y cumplir con obligaciones legales.</p>

        <h2 style={legalH2}>4. Base legal (RGPD)</h2>
        <p style={legalP}>Tratamos tus datos basándonos en: ejecución del contrato, consentimiento (marketing), interés legítimo (mejora del producto) y obligación legal (facturación, fiscalidad).</p>

        <h2 style={legalH2}>5. Con quién compartimos</h2>
        <p style={legalP}>Nunca vendemos tus datos. Solo compartimos con proveedores esenciales del servicio: Supabase (base de datos, almacenamiento en UE), Stripe (pagos), Vercel (alojamiento) y Resend (emails transaccionales); y con autoridades legales cuando sea legalmente requerido.</p>

        <h2 style={legalH2}>6. Transferencias internacionales</h2>
        <p style={legalP}>Almacenamos tus datos principalmente en servidores dentro de la Unión Europea. Algunos proveedores (Stripe, Vercel) pueden procesar datos fuera del EEE bajo cláusulas contractuales estándar aprobadas por la Comisión Europea.</p>

        <h2 style={legalH2}>7. Cuánto tiempo guardamos tus datos</h2>
        <p style={legalP}>Datos de cuenta activa: mientras tu cuenta esté activa. Datos tras eliminar cuenta: borrados en 30 días. Datos de facturación: conservados 6 años (obligación fiscal).</p>

        <h2 style={legalH2}>8. Tus derechos</h2>
        <p style={legalP}>Tienes derecho a acceder, rectificar, eliminar ("derecho al olvido"), limitar el tratamiento, portabilidad, oponerte al tratamiento, retirar tu consentimiento en cualquier momento y presentar una reclamación ante la AEPD. Para ejercerlos, escríbenos a privacidad@traceetx.com.</p>

        <h2 style={legalH2}>9. Seguridad</h2>
        <p style={legalP}>Aplicamos cifrado en tránsito (HTTPS), cifrado en reposo, autenticación segura y acceso restringido al personal autorizado.</p>

        <h2 style={legalH2}>10. Cookies</h2>
        <p style={legalP}>Ver nuestra Política de Cookies para más detalles.</p>

        <h2 style={legalH2}>11. Cambios a esta política</h2>
        <p style={legalP}>Te notificaremos por email de cambios significativos. La fecha de "última actualización" indica cuándo se modificó por última vez.</p>

        <h2 style={legalH2}>12. Contacto</h2>
        <p style={legalP}>¿Preguntas? Escríbenos a privacidad@traceetx.com</p>
      </LegalLayout>
    </MarketingLayout>
  );
}
