import Link from 'next/link'
import { UtensilsCrossed } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Términos y Condiciones — MandaMenu',
  description: 'Términos y condiciones de uso de la plataforma MandaMenu.',
}

const LAST_UPDATED = '1 de abril de 2025'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#F5F2ED]">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 max-w-4xl mx-auto">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gray-950 rounded-xl flex items-center justify-center">
            <UtensilsCrossed size={14} className="text-white" />
          </div>
          <span className="font-black text-lg tracking-tight">MandaMenu</span>
        </Link>
      </nav>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-8 py-12 pb-24">
        <div className="mb-12">
          <p className="text-xs font-bold text-orange-500 uppercase tracking-widest mb-3">Legal</p>
          <h1 className="text-5xl font-black tracking-tighter leading-tight mb-3">
            Términos y<br />Condiciones
          </h1>
          <p className="text-sm text-gray-400">Última actualización: {LAST_UPDATED}</p>
        </div>

        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 md:p-12 flex flex-col gap-10 text-gray-700 text-[15px] leading-relaxed">

          <Section title="1. Sobre MandaMenu">
            <p>
              MandaMenu es una plataforma tecnológica de software como servicio (SaaS) que permite a restaurantes, food trucks, cocinas ocultas y negocios gastronómicos crear y gestionar su menú digital, recibir pedidos y gestionar su operación.
            </p>
            <p>
              MandaMenu <strong>no es un restaurante, no prepara alimentos, no realiza entregas y no es parte de la transacción comercial</strong> entre el cliente final y el establecimiento. Somos únicamente el canal tecnológico que conecta a ambas partes.
            </p>
          </Section>

          <Section title="2. Responsabilidad del restaurante">
            <p>El restaurante (usuario de la plataforma) es el único responsable de:</p>
            <ul>
              <li>La calidad, estado, temperatura, presentación e inocuidad de los alimentos y bebidas que ofrece.</li>
              <li>El cumplimiento de la normativa sanitaria, de habilitación y de funcionamiento vigente en su país y localidad.</li>
              <li>La veracidad y actualización de la información publicada en su menú digital (precios, disponibilidad, ingredientes, alérgenos).</li>
              <li>Los tiempos de preparación y entrega informados al cliente.</li>
              <li>La atención al cliente y la resolución de quejas o reclamos relacionados con su servicio.</li>
              <li>El cobro y la gestión de pagos con sus clientes finales.</li>
            </ul>
            <p>
              MandaMenu no asume responsabilidad alguna por daños a la salud, intoxicaciones, alergias, pérdidas económicas u otros perjuicios derivados del consumo de los productos ofrecidos por los restaurantes en la plataforma.
            </p>
          </Section>

          <Section title="3. Tiempos de entrega y logística">
            <p>
              MandaMenu no gestiona, coordina ni garantiza servicios de entrega a domicilio. Los tiempos de preparación y entrega son estimaciones proporcionadas por cada restaurante y pueden variar según la demanda, condiciones externas u otros factores fuera del control de la plataforma.
            </p>
            <p>
              MandaMenu no se hace responsable por retrasos, cancelaciones, entregas incorrectas o cualquier incidencia relacionada con la logística de despacho de pedidos.
            </p>
          </Section>

          <Section title="4. Exactitud del contenido del menú">
            <p>
              Cada restaurante es el único responsable de mantener su menú actualizado, incluyendo precios, descripciones, imágenes y disponibilidad de productos. MandaMenu no verifica ni valida el contenido publicado por los restaurantes y no se hace responsable por diferencias entre lo publicado y lo servido.
            </p>
          </Section>

          <Section title="5. Pagos y transacciones">
            <p>
              MandaMenu no procesa, retiene ni garantiza pagos entre los clientes finales y los restaurantes. Las transacciones económicas son responsabilidad exclusiva de las partes involucradas. Los cobros que realiza MandaMenu corresponden únicamente al uso de la plataforma según el plan contratado.
            </p>
          </Section>

          <Section title="6. Planes, facturación y cancelación">
            <p>
              Los planes de suscripción tienen un período de prueba gratuito de 30 días sin necesidad de tarjeta de crédito. Una vez finalizado el período de prueba, el acceso a las funciones del plan contratado requiere el pago de la suscripción correspondiente.
            </p>
            <p>
              MandaMenu se reserva el derecho de modificar los precios de sus planes con un aviso previo mínimo de 30 días. El usuario puede cancelar su suscripción en cualquier momento; el acceso permanecerá activo hasta el fin del período pagado.
            </p>
            <p>
              No se realizan reembolsos por períodos parciales ya facturados, salvo que la legislación aplicable lo exija.
            </p>
          </Section>

          <Section title="7. Uso aceptable y suspensión de cuenta">
            <p>El usuario se compromete a utilizar la plataforma de forma lícita y a no:</p>
            <ul>
              <li>Publicar contenido falso, engañoso, ilegal u ofensivo.</li>
              <li>Utilizar la plataforma para actividades fraudulentas.</li>
              <li>Intentar acceder a cuentas o datos de otros usuarios.</li>
              <li>Hacer un uso que afecte la estabilidad o disponibilidad del servicio.</li>
            </ul>
            <p>
              MandaMenu se reserva el derecho de suspender o eliminar sin previo aviso cualquier cuenta que incumpla estos términos o que sea utilizada de manera que contravenga la ley.
            </p>
          </Section>

          <Section title="8. Disponibilidad del servicio">
            <p>
              MandaMenu hace su mejor esfuerzo para mantener la plataforma disponible de forma continua, pero no garantiza una disponibilidad del 100%. Pueden existir períodos de mantenimiento, actualizaciones o interrupciones imprevistas. MandaMenu no se hace responsable por pérdidas derivadas de la indisponibilidad temporal del servicio.
            </p>
          </Section>

          <Section title="9. Propiedad intelectual y contenido">
            <p>
              El contenido subido por el restaurante (nombres, descripciones, imágenes, logos) es de su propiedad. Al publicarlo en MandaMenu, el restaurante otorga a la plataforma una licencia no exclusiva para mostrarlo a los usuarios finales con el fin de prestar el servicio.
            </p>
            <p>
              La marca, diseño, código y funcionalidades de MandaMenu son propiedad de sus creadores y están protegidos por las leyes de propiedad intelectual aplicables.
            </p>
          </Section>

          <Section title="10. Privacidad y datos">
            <p>
              Los datos recopilados a través de la plataforma (nombre, correo, información del negocio) se usan exclusivamente para la prestación del servicio. No vendemos ni compartimos datos personales con terceros, salvo cuando sea requerido por ley o para el funcionamiento del propio servicio (procesadores de pago, infraestructura de hosting).
            </p>
          </Section>

          <Section title="11. Limitación de responsabilidad">
            <p>
              En ningún caso MandaMenu, sus fundadores, empleados o proveedores serán responsables por daños indirectos, incidentales, especiales o consecuentes derivados del uso o la imposibilidad de uso de la plataforma, incluyendo pero no limitado a pérdidas de ingresos, datos o reputación.
            </p>
            <p>
              La responsabilidad total de MandaMenu frente a un usuario no podrá superar el monto pagado por dicho usuario en los últimos 3 meses por concepto de suscripción.
            </p>
          </Section>

          <Section title="12. Modificaciones a estos términos">
            <p>
              MandaMenu puede actualizar estos términos en cualquier momento. Las modificaciones relevantes serán comunicadas por correo electrónico o mediante un aviso en la plataforma. El uso continuado del servicio después de la notificación implica la aceptación de los nuevos términos.
            </p>
          </Section>

          <Section title="13. Jurisdicción y ley aplicable">
            <p>
              Estos términos se rigen por las leyes de la República de Colombia. Cualquier controversia que surja en relación con el uso de la plataforma será sometida a los tribunales competentes de Colombia, renunciando las partes a cualquier otro fuero que pudiera corresponderles.
            </p>
          </Section>

          <div className="pt-4 border-t border-gray-100">
            <p className="text-sm text-gray-400">
              ¿Preguntas? Escribinos a{' '}
              <a href="mailto:hola@mandamenu.com" className="text-gray-700 underline underline-offset-2 hover:text-orange-500 transition-colors">
                hola@mandamenu.com
              </a>
            </p>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 px-8 py-8">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="font-black text-sm">MandaMenu</span>
          <p className="text-xs text-gray-400">© {new Date().getFullYear()} MandaMenu — Todos los derechos reservados</p>
          <Link href="/" className="text-xs text-gray-400 hover:text-gray-900 transition-colors">
            Volver al inicio
          </Link>
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
