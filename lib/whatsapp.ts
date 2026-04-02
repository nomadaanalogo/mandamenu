interface OrderItem {
  name: string; quantity: number; price: number
  extras?: { name: string; price: number }[]
}

interface WhatsAppOrderParams {
  whatsapp: string; restaurantName: string
  customerName: string; items: OrderItem[]; notes?: string
}

export function buildWhatsAppUrl({ whatsapp, restaurantName, customerName, items, notes }: WhatsAppOrderParams): string {
  const number = whatsapp.replace(/\D/g, '')
  let message = `*Pedido - ${restaurantName}*\nCliente: ${customerName}\n\n`
  let total = 0

  items.forEach((item) => {
    const itemTotal = item.price * item.quantity
    total += itemTotal
    message += `• ${item.quantity}x ${item.name} - $${itemTotal.toFixed(2)}\n`
    item.extras?.forEach((extra) => {
      message += extra.price > 0 ? `  + ${extra.name} (+$${extra.price.toFixed(2)})\n` : `  + ${extra.name}\n`
    })
  })

  if (notes) message += `\nNotas: ${notes}`
  message += `\n\n*Total: $${total.toFixed(2)}*`
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`
}