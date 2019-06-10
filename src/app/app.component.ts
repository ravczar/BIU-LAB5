import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { Subject, Observer, Subscription, fromEvent, interval, timer } from 'rxjs';
import { filter, delay, debounceTime, map } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})

export class AppComponent implements OnInit, OnDestroy{
    /*  
     * .TIMER Observable "timer"<=(Delay Time, amout of time)
     *  New Sub +1. Our private variables
     */
    private appTitle: string = 'BIU LAB 5';
    private index: number = 1; // list index purposes
    private timer = timer(10, 10); // time count purposes
    private timerSubscription = new Subscription();  // Observable subscription
    private timerMillis :number = 0;
    private anyRecordsPresent :boolean = false;
    /*
     * .INTERVAL, use this value to update timer. This returns a count every 100 [ms] (1/10 of a sec). 1+ 2+ 3+.. 
     *  New Sub +2. This is to be used to update the timer.
     */
    interval = interval(100);
    intervalSubscription = new Subscription();

    public state = {
        timerOn: false,
        startTime: null,
        elapsedTime: null,
        lapTimes: []
    };

    private time = {
        id: this.index,
        elapsed: null,
        minutes: null,
        seconds: null,
        millis: null
    };
    /*
     *  ON INIT() , ON DESTROY()
     *  At start - load current stare of timer 00:00.00
     *  If state available - updt values od timer.
     *  If storage changes - add listener to Windows storage chagne events
     */
    ngOnInit() {  
        this.getState();
        this.updateTimer();
        this.resetTimer(); // Does not let saving an empty time after refreshing / reopening web
        window.addEventListener('storage', e => {
            this.temporaryStopTimer();
            this.getState();
        });
    }
    ngOnDestroy() {
      this.setState();
    }
    /*
     *   Main methods:
     *      StartTimer, getState, setState, temporaryStopTimer, resetTimer, addRecordToLapList, removeLapFromTheList
     * 
     */
    private startTimer() {
        this.state.timerOn = !this.state.timerOn;
        if (this.state.timerOn) { // Timer on
            this.state.startTime = new Date(); //  set the start time in the state
            this.setState(); // Set the state
        } else { // If the timer is off
            this.state.startTime = null; // set the start time to null
            this.state.elapsedTime = this.time.elapsed; // set the elapsed timer value in the state
            this.setState(); // Set the state
        }
        this.getState(); // Finally get the state
    }

    // LOCAL STORAGE UPDATE
    private setState() { 
        localStorage.setItem('state', JSON.stringify(this.state)); 
    }
    /*
     *  read last known state from localStorage, set the state from local storage if available.
     *  
     */
    private getState() {
        const state = JSON.parse(localStorage.getItem('state')); // Get state from localStorage
        if (state) {
            this.state = state;
            if( this.state.lapTimes.length > 0) 
                this.anyRecordsPresent = true; // Just to show an extra 'delet-all' button
            if (this.state.timerOn) { // Check if start time was set.
                if (this.state.startTime) { // calculate how long it has run for
                    this.elapsedTime();
                    this.play(); // starts timer
                } else { 
                    this.play();
                }
            } else { // If the timer was not running. Check if elapsed time is zero.
                if (this.state.elapsedTime === 0) {
                    this.temporaryStopTimer();
                    this.resetTimer();
                } else { 
                    this.temporaryStopTimer();
                }
            }
        } else { // if the state is not saved then set the state.
            this.setState();
        }
    }
    /* 
     * Method play starts subscription to Observable 
     */
     private play() {
        this.timerSubscription =
            this.timer.subscribe(
                val => { this.timerMillis = val; }
            );

        this.intervalSubscription = this.interval.subscribe(
            () => this.updateTimer()
        );
    }
    /*
     * Pausing timer needs Observable.unsubscribe();
     * first change boolean to let start button work properly.
     */
    private temporaryStopTimer() {
        this.state.timerOn = false;
        this.intervalSubscription.unsubscribe();
        this.timerSubscription.unsubscribe();
    }

    private updateTimer() {
        this.time.elapsed = this.state.elapsedTime + this.timerMillis;
        this.calculateTime();
    }
    /*
     * This method calculate time for our Time{} - to be show in separate field, as minutes, seconds and milliseconds. It also adds 0 before score with padStart function.
     */
    private calculateTime() {
        const minuteReminder = this.time.elapsed % 6000;
        this.time.minutes = (Math.floor(this.time.elapsed / 6000).toString()).padStart(2, '0');
        this.time.seconds = (Math.floor(minuteReminder / 100).toString()).padStart(2, '0');
        this.time.millis = ((minuteReminder % 100).toString()).padStart(2, '0');
    }
    /*
     * Easiest way to count the time passedBy since start till nowOn it records state.elapsedTime value
     */
    private elapsedTime() {
        const now = new Date();
        const start = new Date(this.state.startTime);
        const lostTime = (now.getTime() - start.getTime()) / 10; // Dividing by 10 because the timer emits values every 10ms (see: private timer = timer(10, 10); ).
        this.state.elapsedTime = this.state.elapsedTime + Math.floor(lostTime);
    }

    private setNewIndex(){
        this.index = this.index++;
    }
    /*  
     *  Reset timer, does not remove list of records, for removing record hve separate button/s
     *  Unsubscribe to the timers by calling the pause method.
     *  Reset all timer values to initial state.
     *  setState() - sets new state to localStorage
     */
     private resetTimer() {
        this.temporaryStopTimer();
        this.timerMillis = 0;
        let temporaryRecordStorage = this.state.lapTimes;

        this.time = {
            id : this.index,
            elapsed: 0,
            minutes: 0,
            seconds: 0,
            millis: 0
        };

        this.state = {
            timerOn: false,
            startTime: null,
            elapsedTime: 0,
            lapTimes: temporaryRecordStorage // or enter empty[] to delete all redords
        };

        this.setState();
    }
    /*
     *  Adds new Record to our lap list. Copies time object inside method. Sets boolean to show 'delete-all icon(trash bin)' sets newState 
     */
    private addRecordToLapList() {
        const lap = { ...this.time }; // Creating a copy curr time object.
        if (lap.minutes || lap.seconds || lap.millis) { //Just checking if time is different than 00:00.00
            this.anyRecordsPresent = true;
            this.index++;
            this.time.id = this.index;
            this.state.lapTimes.splice(0, 0, lap);
            this.setState();
            console.log(this.state.lapTimes);
            console.log(this.state.lapTimes.length);
        }
    }
    /* 
     *  Removes all laps from our memory but also clears it from local storage state.lapTimes = [] &&  by setState() 
     */  
    private removeAllLaps() {
        this.anyRecordsPresent = false;
        this.state.lapTimes = [];
        this.setState();
    }
    /* 
     *   Removes a lap from the state.lapTimes[] without leaving an undefined entry like delete array[x] does and resets this.state 
     */
    private removeLap(index :number) {
        this.state.lapTimes.splice(index, 1);
        this.setState();
        if(index == 0){
            this.anyRecordsPresent = false;
            this.index = 1;
        }
    }

}
