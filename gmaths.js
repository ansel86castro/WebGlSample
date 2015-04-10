function sphericalToCartesian(phi, theta, radius){
	 var b = radius * Math.sin(phi);
     return new CL3D.Vect3d(b * Math.sin(theta), radius * Math.cos(phi), b * Math.cos(theta));
}

function raySphereIntersect(center, radius, rayPos, rayDir){
    
    var t1 = 0;
    var t2 = 0;
    var e = rayPos.substract(center);
    var a = rayDir.dotProduct(rayDir);
    var b = 2 * e.dotProduct(rayDir);
    var c = e.dotProduct(e) - radius * radius;

    var d = b * b - 4 * a * c;
    if (d < 0)
        return false;
    if (d == 0){
        t1 = t2 = -b / 2 * a;
        return t1 > 0;
    }
    var k = Math.sqrt(d);
    var a2 = 2 * a;
    t1 = (-b - k) / a2;
    t2 = (-b + k) / a2;

    return t1 > 0 || t2 > 0;
}

Spherical = function (theta, phi) {
    //pitch
    this.Theta = theta;
    //heading
    this.Phi = phi;

    this.toCartesian = function () {
        var b = Math.sin(this.Theta);
        return new CL3D.Vect3d(b * Math.sin(this.Phi), Math.cos(this.Theta), b * Math.cos(this.Phi));
    }
}
Spherical.toCartesian = function (theta, phi) {
    var b = Math.sin(theta);
    return new CL3D.Vect3d(b * Math.sin(phi), Math.cos(theta), b * Math.cos(phi));
}