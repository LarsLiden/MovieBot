/**
 * Copyright (c) Microsoft Corporation. All rights reserved.  
 * Licensed under the MIT License.
 */
import config from './config'
import { startUiServer } from '@conversationlearner/sdk'

startUiServer(config.CONVERSATION_LEARNER_UI_PORT)
