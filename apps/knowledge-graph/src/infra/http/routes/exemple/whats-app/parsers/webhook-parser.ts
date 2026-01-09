import { z } from 'zod'
import {
	MessageProcessState,
	MessageReceivedEvent,
} from '@/application/main/events/message-received-event'
import { parseInboundMessage } from './message-parser'
import { InboundMessageSubType } from '@/domain/whatsapp'

const messageSchema = z
	.object({
		id: z.string(),
		from: z.string(),
		timestamp: z.string(),
		type: z.string(),
	})
	.catchall(z.unknown())

const changeValueSchema = z
	.object({
		messaging_product: z.literal('whatsapp'),
		metadata: z.object({
			display_phone_number: z.string(),
			phone_number_id: z.string(),
		}),
		contacts: z.array(
			z.object({ profile: z.object({ name: z.string().optional() }) })
		),
		messages: z.array(messageSchema).optional(),
		statuses: z.array(z.unknown()).optional(), // to ignore status updates
	})
	.catchall(z.unknown())

const webhookPayloadSchema = z.object({
	object: z.literal('whatsapp_business_account'),
	entry: z.array(
		z.object({
			id: z.string(),
			changes: z.array(
				z.object({
					field: z.literal('messages'),
					value: changeValueSchema,
				})
			),
		})
	),
})

type SuccessParseResult = {
	type: 'success'
	event: MessageReceivedEvent
}

type ErrorParseResult = {
	type: 'error'
	reason: string
	senderPhone?: string
}

type UnsupportedParseResult = {
	type: 'unsupported'
	reason: string
}

export type WebhookParseResult =
	| SuccessParseResult
	| ErrorParseResult
	| UnsupportedParseResult

export class WebhookParserService {
	parse(payload: unknown): WebhookParseResult {
		const parsedPayload = webhookPayloadSchema.safeParse(payload)

		if (!parsedPayload.success) {
			return { type: 'unsupported', reason: 'Invalid webhook structure' }
		}

		let event: MessageReceivedEvent | undefined
		const change = parsedPayload.data.entry[0].changes[0]
		const { value } = change

		if (!value.messages) {
			return { type: 'unsupported', reason: 'Not a message payload' }
		}

		const senderName = value.contacts[0]?.profile?.name

		for (const message of value.messages) {
			const parsedMessage = parseInboundMessage(message)

			if (!parsedMessage) {
				return {
					type: 'error',
					reason: `Unsupported message type: ${message.type}`,
					senderPhone: message.from,
				}
			}

			event = {
				messageId: parsedMessage.id,
				messageType: parsedMessage.type,
				subType: parsedMessage.subType, // ⬅️ ADICIONAR
				text: parsedMessage.text,
				timestamp: parsedMessage.timestamp,
				senderPhone: parsedMessage.from,
				receiverPhone: value.metadata.display_phone_number,
				senderName,
				state: MessageProcessState.PENDING,

				// Media fields
				mediaId: 'mediaId' in parsedMessage ? parsedMessage.mediaId : undefined,
				mimeType:
					'mimeType' in parsedMessage ? parsedMessage.mimeType : undefined,
				sha256: 'sha256' in parsedMessage ? parsedMessage.sha256 : undefined,
				filename:
					'filename' in parsedMessage ? parsedMessage.filename : undefined,

				// Interactive fields
				interactiveId:
					'interactiveId' in parsedMessage
						? parsedMessage.interactiveId
						: undefined,
				interactiveType:
					'subType' in parsedMessage &&
					(parsedMessage.subType === InboundMessageSubType.LIST_REPLY ||
						parsedMessage.subType === InboundMessageSubType.BUTTON_REPLY)
						? (parsedMessage.subType.toLowerCase() as
								| 'list_reply'
								| 'button_reply')
						: undefined,
			}

			return { type: 'success', event }
		}

		return { type: 'unsupported', reason: 'Invalid webhook structure' }
	}
}
