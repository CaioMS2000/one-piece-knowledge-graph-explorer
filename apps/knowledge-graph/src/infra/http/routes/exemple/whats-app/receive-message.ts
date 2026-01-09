import type { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { MessagingService } from '@/application/main/services/messaging-service'
import { env } from '@/config/env'
import type { MessageQueue } from '@/queue/mensageQueue'
import { WebhookParserService } from './parsers/webhook-parser'
import { savePayloadToJson } from '@/utils/save-payload-to-json'
import { MessageType } from '@/domain/whatsapp'

type Resources = {
	messageQueue: MessageQueue
	messagingService: MessagingService
}

export async function receiveMessage(
	app: FastifyInstance,
	resources: Resources
) {
	const webhookParser = new WebhookParserService()

	// POST ingestion -> enqueue ProcessMensageCommand
	app.withTypeProvider<ZodTypeProvider>().post('/', {
		schema: {
			tags: ['Webhook'],
			summary: 'Receive WhatsApp message webhook',
		},
		handler: async (req, reply) => {
			// Save the raw webhook payload
			await savePayloadToJson(req.body)

			const parseResult = webhookParser.parse(req.body)

			switch (parseResult.type) {
				case 'success': {
					const event = parseResult.event
					await resources.messageQueue.enqueue(event)

					req.log.info(
						{
							messageId: event.messageId,
							type: event.messageType,
							from: event.senderPhone,
							senderName: event.senderName,
						},
						'Message enqueued for processing'
					)
					break
				}

				case 'error': {
					req.log.error(
						{ reason: parseResult.reason, body: req.body },
						'Failed to parse message from webhook'
					)
					// Envia mensagem de fallback para o usuário, se possível
					if (parseResult.senderPhone) {
						await resources.messagingService.send({
							type: MessageType.TEXT,
							to: { phone: parseResult.senderPhone },
							text: 'Não foi possível processar sua mensagem. Por favor, tente novamente.',
						})
					}
					// Retorna 400 para indicar que o payload tinha um problema
					return reply.status(400).send({ error: parseResult.reason })
				}

				case 'unsupported': {
					req.log.info(
						{ reason: parseResult.reason },
						'Ignored webhook payload'
					)
					break
				}

				default: {
					req.log.error({ parseResult }, 'Unknown parse result type')
					break
				}
			}

			return reply.status(202).send()
		},
	})
}
