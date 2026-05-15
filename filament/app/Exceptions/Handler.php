<?php

namespace App\Exceptions;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Illuminate\Validation\ValidationException;
use League\Flysystem\UnableToRetrieveMetadata;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Throwable;

class Handler extends ExceptionHandler
{
    /**
     * A list of the exception types that are not reported.
     *
     * @var array<int, class-string<Throwable>>
     */
    protected $dontReport = [
        //
    ];

    /**
     * A list of the inputs that are never flashed for validation exceptions.
     *
     * @var array<int, string>
     */
    protected $dontFlash = [
        'current_password',
        'password',
        'password_confirmation',
    ];

    /**
     * Register the exception handling callbacks for the application.
     *
     * @return void
     */
    public function register()
    {
        $this->reportable(function (Throwable $e): void {
            //
        });

        $this->renderable(function (UnableToRetrieveMetadata $e, $request) {
            throw ValidationException::withMessages([
                'image' => ['Le fichier image a expiré. Veuillez le sélectionner à nouveau et resoumettre.'],
            ]);
        });
    }

    protected function throttle(Throwable $e): ?Limit
    {
        if (($e instanceof HttpException) && ($e->getStatusCode() === 419)) {
            return Limit::perMinute(1);
        }

        return null;
    }
}
