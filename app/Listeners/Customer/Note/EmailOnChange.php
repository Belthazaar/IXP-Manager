<?php

namespace IXP\Listeners\Customer\Note;

/*
 * Copyright (C) 2009-2018 Internet Neutral Exchange Association Company Limited By Guarantee.
 * All Rights Reserved.
 *
 * This file is part of IXP Manager.
 *
 * IXP Manager is free software: you can redistribute it and/or modify it
 * under the terms of the GNU General Public License as published by the Free
 * Software Foundation, version v2.0 of the License.
 *
 * IXP Manager is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE.  See the GpNU General Public License for
 * more details.
 *
 * You should have received a copy of the GNU General Public License v2.0
 * along with IXP Manager.  If not, see:
 *
 * http://www.gnu.org/licenses/gpl-2.0.html
 */

use D2EM, Mail;

use IXP\Events\Customer\Note\{
    Added   as CustomerNoteAddedEvent
};

use Entities\{
    User as UserEntity
};


use IXP\Events\Customer\Note\Changed as NoteChangedEvent;
use IXP\Mail\Customer\Note\Changed as CustomerNoteChangedMailable;

class EmailOnChange
{
    /**
     * Handle customer note added
     */
    public function onAddedNote( $event ) {
        $this->handle( $event );
    }

    /**
     * Handle customer note edited
     */
    public function onEditedNote( $event ) {
        $this->handle( $event );
    }

    /**
     * Handle customer note deleted
     */
    public function onDeletedNote( $event ) {
        $this->handle( $event );
    }

    /**
     * Register the listeners for the subscriber.
     *
     * @param  \Illuminate\Events\Dispatcher  $events
     */
    public function subscribe( $events )
    {
        $events->listen(
            'IXP\Events\Customer\Note\Added',
            'IXP\Listeners\Customer\Note\EmailOnChange@onAddedNote'
        );

        $events->listen(
            'IXP\Events\Customer\Note\Edited',
            'IXP\Listeners\Customer\Note\EmailOnChange@onEditedNote'
        );

        $events->listen(
            'IXP\Events\Customer\Note\Deleted',
            'IXP\Listeners\Customer\Note\EmailOnChange@onDeletedNote'
        );
    }


    /**
     * Create the event listener.
     *
     * @return void
     */
    public function __construct()
    {
        //
    }

    /**
     * Handle the event.
     *
     * @param  NoteChangedEvent $e
     * @return void
     */
    public function handle( $e )
    {
        // get admin users
        $users = D2EM::getRepository( UserEntity::class )->findBy( [ 'privs' => UserEntity::AUTH_SUPERUSER ] );

        foreach( $users as $user ) {

            /** @var UserEntity $user */
            if( !$user->getPreference( "customer-notes.notify" ) ) {

                if( !$user->getPreference( "customer-notes.{$e->getCustomer()->getId()}.notify" ) ) {

                    if( !$e->getOldNote() || !$e->isTypeAdded() ) {
                        continue;
                    }

                    if( !$user->getPreference( "customer-notes.watching.{$e->getOldNote()->getId()}" ) ) {
                        continue;
                    }
                }
            }
            else if( $user->getPreference( "customer-notes.notify" ) == "none" ) {
                continue;
            }

            // so user wants to be notified:
            Mail::to( $user->getContact()->getEmail() )->send( new CustomerNoteChangedMailable( $e ) );

        }

    }
}
