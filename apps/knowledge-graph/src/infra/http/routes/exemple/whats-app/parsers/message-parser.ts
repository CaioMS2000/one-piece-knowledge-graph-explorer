import {
	InboundMessageSubType,
	MessageSubType,
	MessageType,
	OutboundMessageSubType,
} from '@/domain/whatsapp'
import type { InboundWhatsAppMessage } from '@/domain/whatsapp/inbound-message-types'

/**
 * Raw WhatsApp webhook message structure
 */
interface RawWhatsAppMessage {
	id: string
	from: string
	timestamp: string
	type: string
	text?: { body: string }
	image?: {
		id: string
		mime_type: string
		sha256: string
		caption?: string
	}
	video?: {
		id: string
		mime_type: string
		sha256: string
		caption?: string
	}
	audio?: {
		id: string
		mime_type: string
		sha256: string
	}
	document?: {
		id: string
		filename: string
		mime_type: string
		sha256: string
		caption?: string
	}
	button?: {
		payload: string
		text: string
	}
	interactive?: {
		type: 'list_reply' | 'button_reply'
		list_reply?: {
			id: string
			title: string
			description?: string
		}
		button_reply?: {
			id: string
			title: string
		}
	}
}

/**
 * Parses a raw WhatsApp webhook message into a typed InboundWhatsAppMessage
 * Extracts a unified 'text' field from different sources based on message type
 */
export function parseInboundMessage(
	raw: unknown
): InboundWhatsAppMessage | null {
	const message = raw as RawWhatsAppMessage

	// Validate required fields
	if (!message.id || !message.from || !message.timestamp || !message.type) {
		return null
	}

	const baseFields = {
		id: message.id,
		from: message.from,
		timestamp: message.timestamp,
	}

	switch (message.type) {
		case 'text':
			return {
				...baseFields,
				type: MessageType.TEXT,
				subType: MessageSubType.TEXT,
				text: message.text?.body ?? '',
			}

		case 'image':
			if (!message.image?.id) return null
			return {
				...baseFields,
				type: MessageType.MEDIA,
				subType: MessageSubType.IMAGE,
				text: message.image.caption ?? '',
				mediaId: message.image.id,
				mimeType: message.image.mime_type,
				sha256: message.image.sha256,
			}

		case 'video':
			if (!message.video?.id) return null
			return {
				...baseFields,
				type: MessageType.MEDIA,
				subType: MessageSubType.VIDEO,
				text: message.video.caption ?? '',
				mediaId: message.video.id,
				mimeType: message.video.mime_type,
				sha256: message.video.sha256,
			}

		case 'audio':
			if (!message.audio?.id) return null
			return {
				...baseFields,
				type: MessageType.MEDIA,
				subType: MessageSubType.AUDIO,
				text: '', // Audio messages don't have text
				mediaId: message.audio.id,
				mimeType: message.audio.mime_type,
				sha256: message.audio.sha256,
			}

		case 'document':
			if (!message.document?.id) return null
			return {
				...baseFields,
				type: MessageType.MEDIA,
				subType: MessageSubType.DOCUMENT,
				text: message.document.caption ?? '',
				mediaId: message.document.id,
				mimeType: message.document.mime_type,
				sha256: message.document.sha256,
				filename: message.document.filename,
			}

		case 'interactive':
			if (!message.interactive?.type) return null

			if (message.interactive.type === 'list_reply') {
				const listReply = message.interactive.list_reply
				if (!listReply?.id || !listReply?.title) return null
				return {
					...baseFields,
					type: MessageType.INTERACTIVE,
					text: listReply.title,
					interactiveId: listReply.id,
					subType: InboundMessageSubType.LIST_REPLY,
					description: listReply.description,
				}
			} else if (message.interactive.type === 'button_reply') {
				const buttonReply = message.interactive.button_reply
				if (!buttonReply?.id || !buttonReply?.title) return null
				return {
					...baseFields,
					type: MessageType.INTERACTIVE,
					text: buttonReply.title,
					interactiveId: buttonReply.id,
					subType: InboundMessageSubType.BUTTON_REPLY,
				}
			}
			return null

		default:
			// Unknown message type
			return null
	}
}
