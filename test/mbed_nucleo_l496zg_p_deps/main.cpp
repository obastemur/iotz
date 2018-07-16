/**
  ******************************************************************************
  * @file       main.cpp
  * @author     Central Lab
  * @version    V1.0.0
  * @date       30 Aug 2016
  * @brief      This demo writes an ndef message with an url inside.
  ******************************************************************************
  * @attention
  *
  * <h2><center>&copy; COPYRIGHT(c) 2016 STMicroelectronics</center></h2>
  *
  * Redistribution and use in source and binary forms, with or without modification,
  * are permitted provided that the following conditions are met:
  *   1. Redistributions of source code must retain the above copyright notice,
  *      this list of conditions and the following disclaimer.
  *   2. Redistributions in binary form must reproduce the above copyright notice,
  *      this list of conditions and the following disclaimer in the documentation
  *      and/or other materials provided with the distribution.
  *   3. Neither the name of STMicroelectronics nor the names of its contributors
  *      may be used to endorse or promote products derived from this software
  *      without specific prior written permission.
  *
  * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
  * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
  * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
  * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
  * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
  * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
  * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
  * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
  * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
  * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
  *
  ******************************************************************************
  */

#include "mbed.h"
#include "XNucleoNFC02A1.h"
#include "DevI2C.h"
#include "NDefLib/NDefNfcTag.h"
#include "NDefLib/RecordType/RecordURI.h"

static volatile bool buttonPress = false; // true when the user press the message

/**
 * Callback for button press.
 */
static void set_button_press() {
  buttonPress = true;
} //if buttonPress

/**
 * Reading and printing NFC tag.
 */
static void read_and_print_nfc_tag(NDefLib::NDefNfcTag &tag) {
  using namespace NDefLib;

  if (tag.open_session() == true) {
    printf("Open Session\r\n");
    NDefLib::Message readMsg;

    tag.read(&readMsg);
    printf("Message Read\r\n");

    if (readMsg.get_N_records()==0) {
      printf("Error Read\r\n");
    } else {
      for (uint32_t i=0;i<readMsg.get_N_records();i++) {
        Record *r = readMsg[i];
        //printRecord(r);
        RecordURI *const temp = (RecordURI*)r;
        printf("Read uriId: %d\r\n",temp->get_uri_id());
        printf("Read uriType: %s\r\n",temp->get_uri_type().c_str());
        printf("Read uriContent: %s\r\n",temp->get_content().c_str());
        delete r;
      } //for
    } //if-else

    tag.close_session();
    printf("Close session\r\n");
  } else {
    printf("Error open read Session\n\r");
  }
}

/**
 * Writing a Ndef URI message linking to the "st.com" website.
 */
int main(void)
{
  /* Using default board pinout. */
  DevI2C i2cChannel(XNucleoNFC02A1::DEFAULT_SDA_PIN,XNucleoNFC02A1::DEFAULT_SDL_PIN);
  XNucleoNFC02A1 *nfcNucleo = XNucleoNFC02A1::instance(i2cChannel,
                                                       XNucleoNFC02A1::DEFAULT_GPO_PIN,XNucleoNFC02A1::DEFAULT_RF_DISABLE_PIN,
                                                       XNucleoNFC02A1::DEFAULT_LED1_PIN,XNucleoNFC02A1::DEFAULT_LED2_PIN,
                                                       XNucleoNFC02A1::DEFAULT_LED3_PIN);
  
  NDefLib::NDefNfcTag& tag =nfcNucleo->get_M24LR().get_NDef_tag();
  M24LR & mM24LRp = nfcNucleo->get_M24LR();
  
  /* Enabling Energy Harvesting. */
  mM24LRp.enable_energy_harvesting();
  
  printf("System Initialization done: !\n\r");
  
  /* Opening the i2c session with the nfc chip. */
  if (tag.open_session() == true) {
    printf("Session opened\n\r");
    nfcNucleo->get_led1() = 1;
    
    /* Creating the NDef message and record. */
    NDefLib::Message msg;
    NDefLib::RecordURI rUri(NDefLib::RecordURI::HTTP_WWW,"st.com/st25");
    msg.add_record(&rUri);
    
    /* Writing the tag. */
    if (tag.write(msg) == true) {
      printf("Tag written\n\r");
      nfcNucleo->get_led2() = 1;
    } else {
      printf("Error writing \n\r");
      nfcNucleo->get_led1() = 0;
    } //if-else
    
    /* Closing the i2c session. */
    if (tag.close_session() == true) {
      printf("Session closed\n\r");
      nfcNucleo->get_led3() = 1;
    } else {
      printf("Error closing the session\n\r");
    } //if-else
  } else {
    printf("Error opening the session\n\r");
  }
  
#if defined(TARGET_STM)
  /* enable the button */
  InterruptIn mybutton(USER_BUTTON);
  
  mybutton.fall(set_button_press);

  /* Each second change the led status and see if the user press the button. */
  while(1) {
    if (buttonPress) {
      /* Writing the read message on console. */
      read_and_print_nfc_tag(tag);
      buttonPress=false;
    }
  }
#else
  read_and_print_nfc_tag(tag);
#endif
}


/************************ (C) COPYRIGHT STMicroelectronics *****END OF FILE****/ 
