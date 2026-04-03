import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Política de Privacidad — MandaMenu',
  description: 'Política de privacidad y tratamiento de datos personales de MandaMenu.',
}

const LAST_UPDATED = '1 de abril de 2025'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#F5F2ED]">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 max-w-4xl mx-auto">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/logo.png" alt="MandaMenu" width={28} height={28} className="object-contain" />
          <span className="font-black text-lg tracking-tight">MandaMenu</span>
        </Link>
      </nav>

      <main className="max-w-4xl mx-auto px-8 py-12 pb-24">
        <div className="mb-12">
          <p className="text-xs font-bold text-orange-500 uppercase tracking-widest mb-3">Legal</p>
          <h1 className="text-5xl font-black tracking-tighter leading-tight mb-3">
            Política de<br />Privacidad
          </h1>
          <p className="text-sm text-gray-400">Última actualización: {LAST_UPDATED}</p>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 md:p-12 flex flex-col gap-10 text-gray-700 text-[15px] leading-relaxed">

          <Section title="1. ¿Quién es el responsable del tratamiento?">
            <p>
              MandaMenu es el responsable del tratamiento de los datos personales recopilados a través de esta plataforma. Para cualquier consulta relacionada con tu privacidad podés escribirnos a{' '}
              <a href="mailto:hola@mandamenu.com" className="text-gray-900 underline underline-offset-2 hover:text-orange-500 transition-colors">
                hola@mandamenu.com
              </a>.
            </p>
          </Section>

          <Section title="2. ¿Qué datos recopilamos?">
            <p>Recopilamos dos tipos de datos:</p>
            <p><strong>De los restaurantes (usuarios de la plataforma):</strong></p>
            <ul>
              <li>Nombre completo y correo electrónico al crear la cuenta.</li>
              <li>Nombre del restaurante, logo, dirección y número de WhatsApp.</li>
              <li>Contenido del menú: productos, precios, imágenes y categorías.</li>
              <li>Información de suscripción y facturación (gestionada por Stripe; no almacenamos datos de tarjetas).</li>
            </ul>
            <p><strong>De los clientes finales (quienes hacen pedidos):</strong></p>
            <ul>
              <li>Nombre, número de teléfono y dirección de entrega, cuando son requeridos para completar un pedido.</li>
              <li>Historial de pedidos asociado al restaurante.</li>
            </ul>
            <p>También recopilamos datos técnicos de uso como dirección IP, tipo de navegador y páginas visitadas, con fines de seguridad y mejora del servicio.</p>
          </Section>

          <Section title="3. ¿Para qué usamos tus datos?">
            <ul>
              <li>Crear y gestionar tu cuenta en la plataforma.</li>
              <li>Procesar y mostrar tu menú digital a los clientes.</li>
              <li>Gestionar pedidos y notificaciones en tiempo real.</li>
              <li>Procesar pagos de suscripción a través de Stripe.</li>
              <li>Enviarte comunicaciones del servicio (actualizaciones, alertas de cuenta).</li>
              <li>Mejorar la plataforma y detectar problemas técnicos.</li>
            </ul>
            <p>No usamos tus datos para publicidad de terceros ni los vendemos bajo ninguna circunstancia.</p>
          </Section>

          <Section title="4. ¿Con quién compartimos tus datos?">
            <p>
              Únicamente compartimos datos con terceros que son necesarios para el funcionamiento del servicio, todos bajo acuerdos de confidencialidad:
            </p>
            <ul>
              <li><strong>Supabase</strong> — infraestructura de base de datos y autenticación.</li>
              <li><strong>Stripe</strong> — procesamiento de pagos de suscripción.</li>
              <li><strong>Vercel / servidor de hosting</strong> — alojamiento de la aplicación.</li>
              <li><strong>Resend</strong> — envío de correos transaccionales (confirmación de cuenta, etc.).</li>
              <li><strong>OpenAI</strong> — procesamiento de imágenes para la función de importación de menú por IA (solo usuarios que usen esa función).</li>
            </ul>
            <p>No compartimos datos con autoridades salvo que exista una orden legal que nos obligue a ello.</p>
          </Section>

          <Section title="5. ¿Por cuánto tiempo guardamos tus datos?">
            <ul>
              <li>Mientras tu cuenta esté activa en la plataforma.</li>
              <li>Al eliminar tu cuenta, borramos tus datos personales en un plazo máximo de 30 días, salvo que la ley nos obligue a conservarlos por más tiempo (por ejemplo, datos de facturación).</li>
              <li>Los datos de pedidos pueden conservarse de forma anonimizada para fines estadísticos.</li>
            </ul>
          </Section>

          <Section title="6. Tus derechos">
            <p>De acuerdo con la Ley 1581 de 2012 (Habeas Data, Colombia) y normativas aplicables, tenés derecho a:</p>
            <ul>
              <li><strong>Acceder</strong> a los datos personales que tenemos sobre vos.</li>
              <li><strong>Rectificar</strong> datos incorrectos o desactualizados.</li>
              <li><strong>Suprimir</strong> tus datos cuando ya no sean necesarios o retires tu consentimiento.</li>
              <li><strong>Oponerte</strong> al tratamiento de tus datos en determinadas circunstancias.</li>
              <li><strong>Revocar</strong> el consentimiento otorgado en cualquier momento.</li>
            </ul>
            <p>
              Para ejercer cualquiera de estos derechos, escribinos a{' '}
              <a href="mailto:hola@mandamenu.com" className="text-gray-900 underline underline-offset-2 hover:text-orange-500 transition-colors">
                hola@mandamenu.com
              </a>{' '}
              con el asunto &ldquo;Derechos ARCO&rdquo;. Respondemos en un máximo de 15 días hábiles.
            </p>
          </Section>

          <Section title="7. Cookies y tecnologías de seguimiento">
            <p>
              Usamos cookies de sesión necesarias para mantener tu inicio de sesión activo. No usamos cookies de seguimiento publicitario ni de terceros con fines de marketing. Podés configurar tu navegador para rechazar cookies, aunque esto puede afectar el funcionamiento de la plataforma.
            </p>
          </Section>

          <Section title="8. Seguridad">
            <p>
              Implementamos medidas técnicas y organizativas para proteger tus datos: conexiones cifradas (HTTPS), autenticación segura, acceso restringido a la base de datos y almacenamiento seguro de contraseñas. Sin embargo, ningún sistema es 100% infalible y no podemos garantizar seguridad absoluta.
            </p>
          </Section>

          <Section title="9. Menores de edad">
            <p>
              MandaMenu está dirigido a personas mayores de 18 años. No recopilamos intencionalmente datos de menores. Si detectamos que un menor ha creado una cuenta, la eliminaremos de inmediato.
            </p>
          </Section>

          <Section title="10. Cambios a esta política">
            <p>
              Podemos actualizar esta política cuando sea necesario. Te notificaremos por correo electrónico o mediante un aviso en la plataforma ante cambios relevantes. El uso continuado del servicio tras la notificación implica la aceptación de la nueva versión.
            </p>
          </Section>

          <div className="pt-4 border-t border-gray-100">
            <p className="text-sm text-gray-400">
              ¿Dudas sobre tu privacidad? Escribinos a{' '}
              <a href="mailto:hola@mandamenu.com" className="text-gray-700 underline underline-offset-2 hover:text-orange-500 transition-colors">
                hola@mandamenu.com
              </a>
            </p>
          </div>

        </div>
      </main>

      <footer className="border-t border-gray-200 px-8 py-8">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="font-black text-sm">MandaMenu</span>
          <p className="text-xs text-gray-400">© {new Date().getFullYear()} MandaMenu — Todos los derechos reservados</p>
          <div className="flex items-center gap-4">
            <Link href="/terminos" className="text-xs text-gray-400 hover:text-gray-900 transition-colors">
              Términos y condiciones
            </Link>
            <Link href="/" className="text-xs text-gray-400 hover:text-gray-900 transition-colors">
              Volver al inicio
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-black text-gray-950 tracking-tight">{title}</h2>
      <div className="flex flex-col gap-3 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-2 [&_ul]:pl-5 [&_ul]:list-disc [&_ul]:marker:text-orange-400 [&_strong]:text-gray-950 [&_strong]:font-semibold">
        {children}
      </div>
    </div>
  )
}
